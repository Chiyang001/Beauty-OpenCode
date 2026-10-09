import os,sys,json,shutil,subprocess,threading,tkinter as tk
from tkinter import filedialog,messagebox
from pathlib import Path
from asar import Archive,digest
ROOT=Path(getattr(sys,'_MEIPASS',Path(__file__).resolve().parent))
DEFAULT=Path(os.environ.get('LOCALAPPDATA',''))/'Programs'/'@opencode-aidesktop'
MARK='/* Beauty OpenCode v2 */'

def running(folder):
    escaped=str(folder/'OpenCode.exe').replace("'","''")
    command="Get-CimInstance Win32_Process -Filter \"Name = 'OpenCode.exe'\" | Where-Object { $_.ExecutablePath -eq '"+escaped+"' } | Select-Object -ExpandProperty ProcessId"
    p=subprocess.run(['powershell','-NoProfile','-Command',command],capture_output=True,text=True,creationflags=0x08000000)
    if p.returncode: raise RuntimeError('无法检查运行状态，请关闭 OpenCode 后重试。')
    return bool(p.stdout.strip())

def paths(folder):
    a=folder/'resources'/'app.asar'
    return a,a.with_name('app.asar.beauty-original'),a.with_name('beauty-opencode.json')

PATCH_VERSION=2

def revision():
    import hashlib
    return hashlib.sha256(b'beauty-shell-hooks-7'+(ROOT/'assets'/'codex.css').read_bytes()+(ROOT/'assets'/'codex-shell.js').read_bytes()+(ROOT/'assets'/'codex-settings.js').read_bytes()).hexdigest()

def build_replacements(arc):
    pkg=json.loads(arc.read('package.json'))
    if pkg.get('name')!='@opencode-ai/desktop':
        raise RuntimeError('请选择 OpenCode Electron 安装目录。')
    html=arc.read('out/renderer/index.html').decode('utf-8')
    if 'beauty-codex' in html: raise RuntimeError('原始备份包含旧补丁，不能继续。')
    entries=arc.index
    styles=[n for n in entries if n.startswith('out/renderer/assets/main-') and n.endswith('.css')]
    scripts=[n for n in entries if n.startswith('out/renderer/assets/main-') and n.endswith('.js')]
    if len(styles)!=1 or len(scripts)!=1: raise RuntimeError('资源结构变化。')
    source=arc.read(scripts[0]).decode('utf-8')
    hooks={
        'function NewLayout(props) {':'function NewLayout(props) {\n  createBeautyShell();',
        'function NewHome() {':'function NewHome() {\n  if (!useLocation().search.includes("beautyOverview=1")) return BeautyHome();',
        '      sync2().session.evict(id2);':'      sync2().session.evict(id2);\n      serverSync().homeSessions.remove(id2);',
        '      sessionIDs: [...removed]':'      server: ServerConnection.key(sdk().server),\n      sessionIDs: [...removed]',
        'const openTitleEditor = () => {':'const openTitleEditor = () => {\n    if (sessionID()) { beautyRename("重命名聊天", titleLabel() ?? "", async value => { const id=sessionID(); await titleMutation.mutateAsync({id,title:value}); document.dispatchEvent(new CustomEvent("beauty:session-renamed",{detail:{id,title:value}})); }); return; }',
        'onSelect: toggleHome':'onSelect: () => document.dispatchEvent(new CustomEvent("beauty:toggle-sidebar"))'
    }
    for old,new in hooks.items():
        if source.count(old)!=1: raise RuntimeError('布局挂载点不匹配：'+old)
        source=source.replace(old,new,1)
    pending='setTitle("pendingRename", true);\n                                        setTitle("menuOpen", false);'
    if source.count(pending)!=2: raise RuntimeError('会话菜单重命名挂载点不匹配。')
    source=source.replace(pending,'setTitle("pendingRename", false);\n                                        setTitle("menuOpen", false);\n                                        requestAnimationFrame(openTitleEditor);')
    source+='\n'+(ROOT/'assets'/'codex-shell.js').read_text(encoding='utf-8-sig')
    html=html.replace('</head>','<meta name="beauty-codex" content="2">\n</head>')
    candidates=[n for n in entries if n.startswith('out/renderer/assets/') and n.endswith('.js') and b'const AppearanceSection = (props) => {' in arc.read(n) and b'const [tab, setTab] = createSignal(props.defaultValue ?? "general");' in arc.read(n)]
    if len(candidates)!=1: raise RuntimeError('无法唯一定位原生设置模块。')
    settings_name=candidates[0]
    settings=arc.read(settings_name).decode('utf-8')
    settings_hook='const DialogSettings = (props) => {'
    if settings.count(settings_hook)!=1: raise RuntimeError('设置布局挂载点不匹配。')
    appearance_hook='const AppearanceSection = (props) => {'
    if settings.count(appearance_hook)!=1: raise RuntimeError('外观设置挂载点不匹配。')
    settings=settings.replace(appearance_hook,appearance_hook+'\n  return null;',1)
    settings=settings.replace('  const [tab, setTab] = createSignal(props.defaultValue ?? "general");','  beautySettingsPage(dialog);\n  const [tab, setTab] = createSignal(props.defaultValue ?? "general");',1)
    settings+='\n'+(ROOT/'assets'/'codex-settings.js').read_text(encoding='utf-8-sig')
    return pkg,{
        settings_name:settings.encode('utf-8'),
        styles[0]:arc.read(styles[0])+b'\n'+MARK.encode()+b'\n'+(ROOT/'assets'/'codex.css').read_bytes(),
        scripts[0]:source.encode('utf-8'),
        'out/renderer/index.html':html.encode('utf-8')
    }

def enable(folder):
    a,b,m=paths(folder)
    if running(folder): raise RuntimeError('请先完全退出 OpenCode，再点击启用 / 升级。工具不会强制结束会话。')
    if not a.exists(): raise RuntimeError('该目录没有 resources/app.asar。')
    previous=m.read_bytes() if m.exists() else None
    previous_state=json.loads(previous) if previous else None
    current_hash=digest(a)
    if previous_state:
        if not b.exists() or digest(b)!=previous_state['original']: raise RuntimeError('原版备份缺失或损坏。')
        if current_hash not in (previous_state['patched'],previous_state['original'],previous_state.get('previous')):
            raise RuntimeError('OpenCode 资源已更新或被其他工具修改，已停止操作。请保存旧备份和校验记录，再适配新版本。')
        if current_hash==previous_state['patched'] and previous_state.get('patchVersion')==PATCH_VERSION and previous_state.get('revision')==revision():
            return '已启用 v2 布局，重新打开 OpenCode 即可。'
        source=b
    else:
        if b.exists(): raise RuntimeError('发现没有校验记录的备份，请先保存或检查该备份。')
        source=a
    arc=Archive(source);pkg,replacements=build_replacements(arc)
    original=digest(source);temp=a.with_name('app.asar.beauty-tmp')
    if not previous_state: shutil.copy2(a,b)
    state={'version':pkg['version'],'patchVersion':PATCH_VERSION,'revision':revision(),'original':original,'patched':None,'previous':current_hash}
    try:
        arc.repack(temp,replacements)
        check=Archive(temp)
        for name,data in replacements.items():
            if check.read(name)!=data: raise RuntimeError('资源写入校验失败：'+name)
        state['patched']=digest(temp)
        # Include both hashes so interrupted upgrades remain recoverable.
        meta_temp=m.with_suffix('.json.tmp')
        meta_temp.write_text(json.dumps(state,indent=2),encoding='utf-8');os.replace(meta_temp,m)
        os.replace(temp,a)
    except Exception:
        temp.unlink(missing_ok=True)
        if digest(a)==current_hash:
            if previous is not None: m.write_bytes(previous)
            else: m.unlink(missing_ok=True);b.unlink(missing_ok=True)
        raise
    return '已启用 Codex v2 布局。重新打开 OpenCode 即可。'

def restore(folder):
    a,b,m=paths(folder)
    if running(folder): raise RuntimeError('请先完全退出 OpenCode，再点击恢复。')
    if not m.exists() or not b.exists(): raise RuntimeError('没有找到本工具的完整备份。')
    state=json.loads(m.read_text(encoding='utf-8'))
    if digest(b)!=state['original']: raise RuntimeError('备份校验失败，已停止恢复。')
    if digest(a) not in (state['patched'],state['original'],state.get('previous')): raise RuntimeError('主程序资源已更新或被其他工具修改，不能用旧备份覆盖。')
    temp=a.with_name('app.asar.beauty-tmp'); shutil.copy2(b,temp); os.replace(temp,a)
    m.unlink(); b.unlink()
    return '已恢复原版样式，重新打开 OpenCode 即可。'

def gui():
    window=tk.Tk(); window.title('Beauty OpenCode'); window.geometry('640x420'); window.configure(bg='#181818'); window.resizable(False,False)
    tk.Label(window,text='Beauty OpenCode',font=('Segoe UI',24,'bold'),fg='#eee',bg='#181818').pack(anchor='w',padx=32,pady=(28,8))
    tk.Label(window,text='Codex v2 布局 · 一键启用 / 升级 / 恢复',font=('Microsoft YaHei UI',12),fg='#aaa',bg='#181818').pack(anchor='w',padx=32)
    path=tk.StringVar(value=str(DEFAULT)); status=tk.StringVar(value='请先退出 OpenCode，再切换样式。')
    row=tk.Frame(window,bg='#181818'); row.pack(fill='x',padx=32,pady=(28,12))
    tk.Entry(row,textvariable=path,bg='#303030',fg='#ddd',insertbackground='white',relief='flat',font=('Segoe UI',10)).pack(side='left',fill='x',expand=True,ipady=10)
    tk.Button(row,text='选择目录',command=lambda:path.set(filedialog.askdirectory() or path.get()),bg='#333',fg='white',relief='flat').pack(side='right',padx=(8,0),ipady=7)
    buttons=[]
    busy=[False]
    window.protocol('WM_DELETE_WINDOW',lambda: None if busy[0] else window.destroy())
    def action(fn):
        busy[0]=True
        for btn in buttons: btn.config(state='disabled')
        status.set('正在校验并处理资源，请稍候…')
        def work():
            try: result=fn(Path(path.get())); error=False
            except Exception as e: result=str(e); error=True
            def done():
                busy[0]=False
                status.set(result)
                for btn in buttons: btn.config(state='normal')
                if error: messagebox.showerror('未完成切换',result)
            window.after(0,done)
        threading.Thread(target=work,daemon=True).start()
    row=tk.Frame(window,bg='#181818'); row.pack(fill='x',padx=32,pady=12)
    for label,fn,color in [('启用 / 升级 v2 布局',enable,'#3478cf'),('恢复原版样式',restore,'#333333')]:
        btn=tk.Button(row,text=label,command=lambda f=fn:action(f),bg=color,fg='white',activebackground=color,activeforeground='white',relief='flat',font=('Microsoft YaHei UI',12),cursor='hand2'); btn.pack(side='left',padx=(0,12),ipadx=15,ipady=11); buttons.append(btn)
    tk.Label(window,textvariable=status,wraplength=565,justify='left',font=('Microsoft YaHei UI',10),fg='#bdbdbd',bg='#181818').pack(anchor='w',padx=32,pady=12)
    tk.Label(window,text='独立桌面资源补丁 · 更新 OpenCode 后需重新适配\n重做导航、项目 / 聊天侧栏及输入区；保留原生聊天功能。',justify='left',font=('Microsoft YaHei UI',9),fg='#777',bg='#181818').pack(anchor='w',padx=32,pady=8)
    window.mainloop()
if __name__=='__main__': gui()
