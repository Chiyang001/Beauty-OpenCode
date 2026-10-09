/* Beauty OpenCode v2: native controllers, custom Codex-style desktop shell. */
function beautyIcon(name) {
  const paths = {
    home:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/>',
    history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    folder:'<path d="M3 7V5h6l2 2h10v13H3z"/><path d="M3 10h18"/>',
    folderClosed:'<path d="M3 8V6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 10h18"/>',
    folderOpen:'<path d="M3 12V6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v3"/><path d="M5 12h16a1 1 0 0 1 1 1.4l-3 6.3A2 2 0 0 1 17 21H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z"/>',
    edit:'<path d="M11 4H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-5M13 11l7-7 2 2-7 7-3 1z"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    settings:'<path d="m12 3 8 4v10l-8 4-8-4V7z"/><circle cx="12" cy="12" r="3"/>',
    panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    pin:'<path d="m15 3 6 6-5 2-3 5-5-5 5-3zM9 15l-6 6"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    reset:'<path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    terminal:'<path d="m8 9 3 3-3 3m6 0h3"/><path d="M8 4c3-4 8-2 9 1 5 0 7 6 4 9 2 5-3 9-7 7-4 3-9 0-9-4-5-2-5-9 0-11 0-2 1-3 3-2z"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    bell:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3l-1 2m0 3v.1"/>'
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name] || paths.folder)+'</svg>';
}
function beautyElement(tag, cls, text) {
  const el=document.createElement(tag); if(cls) el.className=cls; if(text!==undefined) el.textContent=text; return el;
}
function beautyButton(label, icon, action, cls='') {
  const b=beautyElement('button','beauty-button '+cls); b.type='button'; b.title=label; b.setAttribute('aria-label',label);
  if(icon) b.innerHTML=beautyIcon(icon);
  if(!cls.includes('beauty-icon-only')) b.append(beautyElement('span','',label));
  b.addEventListener('click',action); return b;
}
function beautyWordmark() {
  const mark=beautyElement('div','beauty-welcome-icon beauty-wordmark');
  mark.setAttribute('aria-label','OpenCode');
  mark.innerHTML="<svg xmlns=http://www.w3.org/2000/svg viewBox=\"0 0 720 129\"fill=none><g opacity=0.6><g><g opacity=0.16><path opacity=0.7 d=\"M55.3846 36.4286H18.4615V91.7143H55.3846V36.4286ZM73.8462 110.143H0V18H73.8462V110.143Z\"fill=currentColor></path><path opacity=0.7 d=\"M110.462 91.7143H147.385V36.4286H110.462V91.7143ZM165.846 110.143H110.462V128.571H92V18H165.846V110.143Z\"fill=currentColor></path><path opacity=0.7 d=\"M258.846 73.2857H203.462V91.7143H258.846V110.143H185V18H258.846V73.2857ZM203.462 54.8571H240.385V36.4286H203.462V54.8571Z\"fill=currentColor></path><path opacity=0.7 d=\"M332.385 36.4286H295.462V110.143H277V18H332.385V36.4286ZM350.846 110.143H332.385V36.4286H350.846V110.143Z\"fill=currentColor></path><path opacity=0.7 d=\"M442.846 36.4286H387.462V91.7143H442.846V110.143H369V18H442.846V36.4286Z\"fill=currentColor></path><path opacity=0.7 d=\"M517.385 36.4286H480.462V91.7143H517.385V36.4286ZM535.846 110.143H462V18H535.846V110.143Z\"fill=currentColor></path><path opacity=0.7 d=\"M609.385 36.8571H572.462V92.1429H609.385V36.8571ZM627.846 110.571H554V18.4286H609.385V0H627.846V110.571Z\"fill=currentColor></path><path opacity=0.7 d=\"M664.462 36.4286V54.8571H701.385V36.4286H664.462ZM719.846 73.2857H664.462V91.7143H719.846V110.143H646V18H719.846V73.2857Z\"fill=currentColor></path></g></g></g><defs><mask maskUnits=userSpaceOnUse x=0 y=0 width=720 height=129 style=mask-type:alpha><rect width=720 height=129></rect></mask><linearGradient x1=360 y1=68 x2=360 y2=129 gradientUnits=userSpaceOnUse><stop stop-color=white stop-opacity=0.7></stop><stop offset=1 stop-color=white stop-opacity=0>";
  mark.querySelectorAll('[opacity]').forEach(node=>node.removeAttribute('opacity'));
  return mark;
}
function beautyReasoningSlider(control){
  const label=value=>({default:'默认',none:'无',minimal:'最低',low:'轻度',medium:'中等',high:'高',xhigh:'极高',max:'最高'}[value]||value);
  const trigger=beautyButton('思考强度','',()=>toggle());trigger.classList.add('beauty-reasoning-trigger');trigger.setAttribute('aria-haspopup','dialog');const arrow=beautyElement('span','beauty-reasoning-arrow');arrow.innerHTML=beautyIcon('chevron');trigger.append(arrow);
  let popup,range,title,track,particles;
  const close=()=>{popup?.remove();popup=undefined;trigger.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keys,true);};
  const outside=e=>{if(!popup?.contains(e.target)&&!trigger.contains(e.target))close();};
  const keys=e=>{if(e.key==='Escape'){close();trigger.focus();}};
  const refresh=()=>{const options=control.options(),current=control.current(),index=Math.max(0,options.findIndex(option=>option.id===current));trigger.firstElementChild.textContent=label(current);if(range){range.max=String(options.length-1);range.value=String(index);range.setAttribute('aria-valuetext',label(current));title.textContent=label(current);popup?.classList.toggle('beauty-reasoning-ultra',options.length>1&&index===options.length-1);const ratio=options.length>1?index/(options.length-1):0;track.style.setProperty('--beauty-range-progress',ratio*100+'%');track.style.setProperty('--beauty-range-ratio',String(ratio));particles.style.opacity=ratio>0?'1':'0';}};
  const toggle=()=>{
    if(popup){close();return;}popup=beautyElement('div','beauty-reasoning-panel');popup.setAttribute('role','dialog');popup.setAttribute('aria-label','调整思考强度');
    title=beautyElement('strong','beauty-reasoning-title');popup.append(title);
    range=beautyElement('input','beauty-reasoning-range');range.type='range';range.min='0';range.step='1';range.setAttribute('aria-label','思考强度');range.addEventListener('input',()=>{const option=control.options()[Number(range.value)];if(option)control.onSelect(option.id);refresh();});track=beautyElement('div','beauty-reasoning-track');track.append(beautyElement('div','beauty-reasoning-fill'));const ticks=beautyElement('div','beauty-reasoning-dots');ticks.setAttribute('aria-hidden','true');for(const option of control.options())ticks.append(beautyElement('span'));particles=beautyElement('div','beauty-reasoning-particles');particles.setAttribute('aria-hidden','true');for(let i=0;i<20;i++){const dot=beautyElement('span','beauty-reasoning-particle');const duration=1.1+(i%4)*.225;dot.style.top=(6+(i*7)%17)+'px';dot.style.width=dot.style.height=(2.2+(i%3)*.8)+'px';dot.style.animationDuration=duration+'s';dot.style.animationDelay=(-i*.185)+'s';particles.append(dot);}track.append(ticks,particles,beautyElement('div','beauty-reasoning-thumb'),range);popup.append(track);document.body.append(popup);refresh();
    const box=trigger.getBoundingClientRect();popup.style.left=Math.max(8,Math.min(box.right-popup.offsetWidth,innerWidth-popup.offsetWidth-8))+'px';popup.style.top=Math.max(8,box.top-popup.offsetHeight-8)+'px';trigger.setAttribute('aria-expanded','true');document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keys,true);range.focus();
  };
  createEffect(refresh);onCleanup(close);return trigger;
}
function beautyTimelineMount(){
  const rail=beautyElement('nav','beauty-timeline');rail.setAttribute('aria-label','对话快速定位');document.body.append(rail);
  let items=[],viewport,frame,selectedID,hoverIndex=-1;
  const wave=index=>{hoverIndex=index;[...rail.children].forEach((button,i)=>{const distance=Math.abs(i-index);const strength=index<0?0:Math.max(0,1-distance/4);button.style.setProperty('--beauty-mark-width',(8+24*strength*strength)+'px');button.style.setProperty('--beauty-mark-opacity',String(.35+.65*strength));});};
  const manualScroll=event=>{if(viewport?.contains(event.target)&&(!event.key||['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))){selectedID=undefined;schedule();}};
  const update=()=>{
    frame=undefined;
    const seen=new Set();const next=[...document.querySelectorAll('#root [data-timeline-row="UserMessage"][data-message-id]')].filter(node=>{if(!node.getClientRects().length||seen.has(node.dataset.messageId))return false;seen.add(node.dataset.messageId);return true;});
    viewport=next[0]?.closest('.scroll-view__viewport');
    if(!viewport&&next[0]){let node=next[0].parentElement;while(node){if(/auto|scroll/.test(getComputedStyle(node).overflowY)){viewport=node;break;}node=node.parentElement;}}
    rail.hidden=!viewport||!next.length;if(rail.hidden)return;
    const box=viewport.getBoundingClientRect();rail.style.left=(box.left+8)+'px';rail.style.top=(box.top+box.height*.5)+'px';rail.style.maxHeight=Math.max(80,box.height-80)+'px';
    if(next.length!==items.length||next.some((node,i)=>node!==items[i])){
      items=next;rail.replaceChildren();
      items.forEach((node,i)=>{const button=beautyElement('button','beauty-timeline-mark');button.type='button';button.setAttribute('aria-label','跳转到第 '+(i+1)+' 轮对话');
        const preview=beautyElement('span','beauty-timeline-preview');preview.textContent=(node.textContent||'第 '+(i+1)+' 轮对话').trim().slice(0,240);button.append(preview);
        button.addEventListener('pointerenter',()=>wave(i));button.addEventListener('focus',()=>wave(i));button.addEventListener('blur',()=>wave(-1));
        button.addEventListener('click',()=>{selectedID=node.dataset.messageId;const offset=node.getBoundingClientRect().top-viewport.getBoundingClientRect().top+viewport.scrollTop-32;viewport.scrollTo({top:offset,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});schedule();});rail.append(button);
      });
      wave(hoverIndex);
    }
    let active=items.findIndex(node=>node.dataset.messageId===selectedID);
    if(active<0){active=0;items.forEach((node,i)=>{if(node.getBoundingClientRect().top<=box.top+34)active=i;});}
    [...rail.children].forEach((button,i)=>{button.classList.toggle('beauty-timeline-active',i===active);if(i===active)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
  };
  const schedule=()=>{if(frame===undefined)frame=requestAnimationFrame(update);};
  rail.addEventListener('pointerleave',()=>wave(-1));
  for(const event of ['wheel','touchstart','pointerdown','keydown'])document.addEventListener(event,manualScroll,true);
  const observer=new MutationObserver(schedule);observer.observe(document.getElementById('root'),{childList:true,subtree:true});document.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);schedule();
  return ()=>{observer.disconnect();document.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);for(const event of ['wheel','touchstart','pointerdown','keydown'])document.removeEventListener(event,manualScroll,true);if(frame!==undefined)cancelAnimationFrame(frame);rail.remove();};
}
function BeautyHome() {
  const home=createHomeController(); const projects=createHomeProjectsController(home);
  const root=beautyElement('section','beauty-home');
  root.append(beautyWordmark());
  root.append(beautyElement('h1','','我们开始做点什么？'));
  root.append(beautyButton('打开项目','folder',()=>{const conn=home.server.focused(); if(conn) projects.project.choose(conn);},'beauty-home-project'));
  return root;
}
function createBeautyShell() {
  const theme=useTheme();
  createEffect(()=>{
    document.documentElement.dataset.beautyTheme=theme.mode();
    window.api?.setBackgroundColor(theme.mode()==='light'?'#f4f4f5':'#202127');
    beautyPresetInit().apply(theme.mode());
  });
  const home=createHomeController(); const projects=createHomeProjectsController(home);
  const sessions=createHomeSessionsController({...home,project:{...home.project,selected:()=>undefined}}); const tabs=useTabs();
  const layout=useLayout(); const navigate=useNavigate(); const location=useLocation();
  const [query,setQuery]=createSignal('');const [view,setView]=createSignal('home');const recent=()=>view()==='recent';const setRecent=v=>setView(v?'recent':'projects');
  const [pins,setPins]=createSignal(beautyRead('beauty.pins',[]));
  const [removedIDs,setRemovedIDs]=createSignal(new Set());
  const keyFor=id=>(home.server.focused()?ServerConnection.key(home.server.focused()):'local')+':'+id;
  const goHome=()=>{setView('home');setCollapsed(false);navigate('/');};
  const [collapsed,setCollapsed]=createSignal(false); const [folded,setFolded]=createSignal(new Set());
  const [collapsedSections,setCollapsedSections]=createSignal(new Set(beautyRead('beauty.collapsedSections',[])));
  const [projectPins,setProjectPins]=createSignal(beautyRead('beauty.projectPins',[]));
  const [projectNames,setProjectNames]=createSignal(beautyRead('beauty.projectNames',{}));
  let closeProjectMenu=()=>{};onCleanup(()=>closeProjectMenu());
  const openProjectMenu=(anchor,project,conn)=>{
    closeProjectMenu();const popup=beautyElement('div','beauty-project-menu');popup.setAttribute('role','menu');
    const close=()=>{popup.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keys,true);anchor.setAttribute('aria-expanded','false');};
    const outside=e=>{if(!popup.contains(e.target)&&!anchor.contains(e.target))close();};const keys=e=>{if(e.key==='Escape'){close();anchor.focus();}};
    closeProjectMenu=close;const add=(label,icon,action)=>{const button=beautyButton(label,icon,()=>{close();action();});button.setAttribute('role','menuitem');popup.append(button);};
    const pinned=projectPins().includes(project.worktree);
    add(pinned?'取消置顶':'置顶','pin',()=>{const next=pinned?projectPins().filter(path=>path!==project.worktree):[project.worktree,...projectPins()];localStorage.setItem('beauty.projectPins',JSON.stringify(next));setProjectPins(next);});
    add('编辑','edit',()=>beautyRename('编辑项目名称',projectNames()[project.worktree]||project.name||getFilename(project.worktree),name=>{const next={...projectNames(),[project.worktree]:name};localStorage.setItem('beauty.projectNames',JSON.stringify(next));setProjectNames(next);}));
    add('在资源管理器中打开','folder',()=>projects.project.reveal(conn,project));
    add('移除项目','trash',()=>{
      const ctx=home.server.focusedContext();if(!ctx||!conn)return;
      const name=projectNames()[project.worktree]||project.name||getFilename(project.worktree);
      beautyConfirmDelete(name,async()=>{
        await beautyDeleteProjectSessions(ctx,project,ServerConnection.key(conn));
        for(let i=tabs.store.length-1;i>=0;i--){const tab=tabs.store[i];if(tab.type==='draft'&&tab.server===ServerConnection.key(conn)&&beautyProjectContains(project,tab.directory))tabs.closeTab(i);}
        projects.project.close(conn,project.worktree);
        const nextPins=projectPins().filter(path=>path!==project.worktree);localStorage.setItem('beauty.projectPins',JSON.stringify(nextPins));setProjectPins(nextPins);
        const nextNames={...projectNames()};delete nextNames[project.worktree];localStorage.setItem('beauty.projectNames',JSON.stringify(nextNames));setProjectNames(nextNames);
      },'移除项目','确定移除项目“'+name+'”并永久删除项目下的所有对话和草稿吗？此操作无法撤销。项目文件夹和代码文件将保留。');
    });
    document.body.append(popup);const box=anchor.getBoundingClientRect();popup.style.left=Math.max(8,Math.min(box.left,window.innerWidth-popup.offsetWidth-8))+'px';popup.style.top=Math.max(8,Math.min(box.bottom+6,window.innerHeight-popup.offsetHeight-8))+'px';anchor.setAttribute('aria-expanded','true');
    document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keys,true);popup.firstElementChild?.focus();
  };
  const highlightCurrentSession=()=>{
    const candidates=[...list.querySelectorAll('[data-current-session="true"]')];
    const chosen=candidates.find(button=>!button.closest('.beauty-section-collapsed'))||candidates[0];
    for(const button of list.querySelectorAll('[data-session-id]'))button.classList.toggle('beauty-selected',button===chosen);
  };
  const openSessionMenu=(anchor,session,pin,remove)=>{
    closeProjectMenu();const popup=beautyElement('div','beauty-project-menu beauty-session-menu');popup.setAttribute('role','menu');popup.setAttribute('aria-label','会话操作');
    const close=()=>{popup.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keys,true);anchor.setAttribute('aria-expanded','false');};
    const outside=e=>{if(!popup.contains(e.target)&&!anchor.contains(e.target))close();};
    const keys=e=>{if(e.key==='Escape'){e.preventDefault();close();anchor.focus();}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const items=[...popup.children];const index=items.indexOf(document.activeElement);items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus();}};
    closeProjectMenu=close;
    const add=(label,icon,action)=>{const item=beautyButton(label,icon,()=>{close();action();});item.setAttribute('role','menuitem');popup.append(item);};
    add(pins().includes(keyFor(session.id))?'取消置顶':'置顶','pin',()=>pin.click());
    add('重命名','edit',()=>beautyRename('重命名聊天',session.title||'',async value=>{
      const ctx=home.server.focusedContext();if(!ctx)throw Error('服务器未连接');
      await ctx.sdk.api.session.update({sessionID:session.id,directory:session.directory,title:value});
      const [store,setStore]=ctx.sync.child(session.directory);setStore(produce(draft=>{const item=draft.session.find(item=>item.id===session.id);if(item)item.title=value;}));
      document.dispatchEvent(new CustomEvent('beauty:session-renamed',{detail:{id:session.id,title:value}}));
    }));
    add('永久删除','trash',()=>remove.click());
    document.body.append(popup);const box=anchor.getBoundingClientRect();popup.style.left=Math.max(8,Math.min(box.right-popup.offsetWidth,window.innerWidth-popup.offsetWidth-8))+'px';popup.style.top=Math.max(8,Math.min(box.bottom+6,window.innerHeight-popup.offsetHeight-8))+'px';anchor.setAttribute('aria-expanded','true');
    document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keys,true);popup.firstElementChild.focus();
  };
  const sectionTitle=(label,key)=>{
    const heading=beautyElement('div','beauty-section-title');heading.dataset.beautySection=key;
    const closed=untrack(collapsedSections).has(key);
    const toggle=beautyButton(label,'chevron',()=>{const next=new Set(collapsedSections());next.has(key)?next.delete(key):next.add(key);localStorage.setItem('beauty.collapsedSections',JSON.stringify([...next]));setCollapsedSections(next);},'beauty-section-toggle');
    toggle.setAttribute('aria-expanded',String(!closed));toggle.classList.toggle('beauty-section-open',!closed);heading.append(toggle);return heading;
  };
  const [menu,setMenu]=createSignal(null);
  let removeTimeline;onMount(()=>{removeTimeline=beautyTimelineMount();});onCleanup(()=>removeTimeline?.());
  const shell=beautyElement('aside','beauty-shell'); shell.id='beauty-shell';
  const rail=beautyElement('nav','beauty-rail'); rail.setAttribute('aria-label','主导航');
  const startNew=()=>{setRecent(false);home.project.openNewSession();};
  rail.append(beautyButton('主页','home',goHome,'beauty-icon-only beauty-rail-home'));
  rail.append(beautyButton('最近聊天','history',()=>{setRecent(true);setCollapsed(false);},'beauty-icon-only'));
  rail.append(beautyButton('项目','folder',()=>{setRecent(false);setCollapsed(false);},'beauty-icon-only'));
  rail.append(beautyButton('添加项目','plus',()=>{const c=home.server.focused();if(c)projects.project.choose(c);},'beauty-icon-only'));
  const spacer=beautyElement('div','beauty-rail-spacer');rail.append(spacer);
  rail.append(beautyButton('设置','settings',()=>projects.utility.settings(),'beauty-icon-only'));
  rail.append(beautyButton('帮助','help',()=>projects.utility.help(),'beauty-icon-only'));
  shell.append(rail);
  const panel=beautyElement('section','beauty-sidebar'); panel.setAttribute('aria-label','项目和聊天');
  const head=beautyElement('div','beauty-sidebar-head');
  head.append(beautyElement('div','beauty-brand','OpenCode'));
  head.append(beautyButton('搜索聊天','search',()=>{setCollapsed(false); search.hidden=!search.hidden;if(!search.hidden)search.focus();},'beauty-icon-only'));
  panel.append(head);
  panel.append(beautyButton('新聊天','edit',startNew,'beauty-new-chat'));
  const search=beautyElement('input','beauty-search');search.placeholder='搜索聊天';search.hidden=true;search.setAttribute('aria-label','搜索聊天');
  search.addEventListener('input',()=>setQuery(search.value));search.addEventListener('keydown',e=>{if(e.key==='Escape'){search.value='';setQuery('');search.hidden=true;}});panel.append(search);
  const list=beautyElement('div','beauty-sidebar-list');panel.append(list);
  const foot=beautyElement('div','beauty-sidebar-foot');
  foot.append(beautyButton('收起侧栏','panel',()=>setCollapsed(true),'beauty-icon-only'));panel.append(foot);
  shell.append(panel);
  const toolbar=beautyElement('nav','beauty-menubar');toolbar.setAttribute('aria-label','窗口菜单');
  const appLogo=beautyElement('div','beauty-title-logo');appLogo.title='OpenCode';appLogo.setAttribute('aria-label','OpenCode');appLogo.innerHTML='<svg viewBox="0 0 16 20" fill="none" aria-hidden="true"><path d="M12 16H4V8H12V16Z" fill="#858585"/><path d="M12 4H4V16H12V4ZM16 20H0V0H16V20Z" fill="currentColor"/></svg>';toolbar.append(appLogo);
  for(const label of ['文件','编辑','视图','帮助']) toolbar.append(beautyButton(label,'',()=>setMenu(menu()===label?null:label),'beauty-menu-trigger'));
  const popup=beautyElement('div','beauty-menu-popup');popup.hidden=true;
  toolbar.addEventListener('mousedown',e=>e.preventDefault());popup.addEventListener('mousedown',e=>e.preventDefault());
  function renderMenu(value){
    popup.replaceChildren(); popup.hidden=!value;
    const add=(label,icon,action)=>popup.append(beautyButton(label,icon,()=>{setMenu(null);action();}));
    if(value==='文件'){add('新聊天','edit',startNew);add('打开项目…','folder',()=>{const c=home.server.focused();if(c)projects.project.choose(c);});add('设置…','settings',()=>projects.utility.settings());add('新窗口','plus',()=>window.api?.runDesktopMenuAction('window.new'));}
    if(value==='编辑'){for(const [label,cmd] of [['撤销','undo'],['重做','redo'],['剪切','cut'],['复制','copy'],['粘贴','paste'],['全选','selectAll']]) add(label,'',()=>window.api?.runDesktopMenuAction('edit.'+cmd));}
    if(value==='视图'){add(collapsed()?'展开侧栏':'收起侧栏','panel',()=>setCollapsed(!collapsed()));add('最近聊天','history',()=>{setRecent(true);setCollapsed(false);});add('放大','plus',()=>window.api?.runDesktopMenuAction('view.zoomIn'));add('缩小','minus',()=>window.api?.runDesktopMenuAction('view.zoomOut'));add('重置缩放','reset',()=>window.api?.runDesktopMenuAction('view.resetZoom'));add('OpenCode 原生首页','home',()=>navigate('/?beautyOverview=1'));}
    if(value==='帮助'){add('OpenCode 帮助','help',()=>projects.utility.help());}
  }
  const queryClient=useQueryClient();const refreshNames=()=>queryClient.invalidateQueries({queryKey:home.server.focusedSync().homeSessions.indexKey});
  const removedSessions=event=>{const detail=readSessionTabsRemovedDetail(event);if(!detail)return;const conn=home.server.focused();if(!conn||(detail.server&&detail.server!==ServerConnection.key(conn)))return;const ids=detail.sessionIDs;setRemovedIDs(new Set([...removedIDs(),...ids.map(keyFor)]));for(const id of ids)home.server.focusedSync().homeSessions.remove(id);const next=pins().filter(id=>!ids.some(sid=>id===keyFor(sid)));localStorage.setItem('beauty.pins',JSON.stringify(next));setPins(next);void refreshNames();};
  createEffect(on(()=>home.server.focusedContext(),ctx=>{if(ctx)void refreshNames();}));
  const pointer=e=>{if(!toolbar.contains(e.target)&&!popup.contains(e.target)&&!head.contains(e.target))setMenu(null);};
  const key=e=>{if(e.key==='Escape')setMenu(null);};
  const toggleSidebar=()=>setCollapsed(!collapsed());
  const command=useCommand();command.register('beauty-shell',()=>[{id:'sidebar.toggle',title:'切换侧栏',category:'view',onSelect:toggleSidebar}]);
  onMount(()=>{
    document.body.dataset.beauty='codex-v2'; document.body.append(shell,toolbar,popup);
    beautyWallpaperInit().mount();
    document.addEventListener('pointerdown',pointer);document.addEventListener('keydown',key);document.addEventListener('beauty:toggle-sidebar',toggleSidebar);document.addEventListener('beauty:session-renamed',refreshNames);window.addEventListener(SESSION_TABS_REMOVED_EVENT,removedSessions);
  });
  onCleanup(()=>{shell.remove();toolbar.remove();popup.remove();delete document.body.dataset.beauty;delete document.documentElement.dataset.beautyTheme;document.body.style.removeProperty('--beauty-sidebar-width');document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',key);document.removeEventListener('beauty:toggle-sidebar',toggleSidebar);document.removeEventListener('beauty:session-renamed',refreshNames);window.removeEventListener(SESSION_TABS_REMOVED_EVENT,removedSessions);});
  createEffect(()=>{document.body.style.setProperty('--beauty-sidebar-width',collapsed()?'52px':'312px');shell.classList.toggle('beauty-collapsed',collapsed());panel.inert=collapsed();});
  createEffect(()=>renderMenu(menu()));
  createEffect(()=>{rail.children[0].classList.toggle('beauty-rail-home',view()==='home');rail.children[1].classList.toggle('beauty-selected',view()==='recent');rail.children[2].classList.toggle('beauty-selected',view()==='projects');});
  createEffect(()=>{
    const pinList=pins();const pinnedProjects=projectPins();const names=projectNames();const projectList=[...home.project.list()].sort((a,b)=>Number(pinnedProjects.includes(b.worktree))-Number(pinnedProjects.includes(a.worktree)));const conn=home.server.focused();
    const live=[];const ctx=home.server.focusedContext();
    if(ctx)for(const project of projectList)for(const directory of [project.worktree,...project.sandboxes||[]]){
      const [store]=ctx.sync.child(directory);
      for(const session of store.session||[])if(!session.parentID&&!session.time?.archived)live.push({session,projectName:project.name||getFilename(project.worktree)});
    }
    const records=beautyMergeSessions(sessions.data.searchRecords(),live,removedIDs(),keyFor).sort((a,b)=>Number(pinList.includes(keyFor(b.session.id)))-Number(pinList.includes(keyFor(a.session.id))));
    const current=layout.route(); const activeTab=tabs.store.find(t=>t.type==='draft' && t.draftID===current.draftID);
    const activeSession=records.find(r=>r.session.id===current.sessionId || r.session.id===current.id);
    const activeDir=activeTab?.directory || activeSession?.session.directory || home.selection.value().directory;
    const filter=query().trim().toLowerCase(); const all=recent(); const folds=untrack(folded);
    list.replaceChildren();
    const title=filter?beautyElement('div','beauty-section-title','搜索结果'):sectionTitle(all?'最近聊天':'项目',all?'recent':'projects');
    if(!filter&&!all)title.append(beautyButton('添加项目','plus',()=>{if(conn)projects.project.choose(conn);},'beauty-icon-only'));list.append(title);
    const addSession=(record,nested)=>{
      const s=record.session; const button=beautyButton(s.title||'新聊天','',()=>sessions.session.open(s),'beauty-session '+(nested?'beauty-session-nested':''));
      button.dataset.sessionId=s.id;button.dataset.currentSession=String(current.sessionId===s.id || current.id===s.id);const row=beautyElement('div','beauty-chat-row');row.append(button);const pinned=pinList.includes(keyFor(s.id));const pin=beautyButton(pinned?'取消置顶':'置顶聊天','pin',()=>{const next=pinned?pins().filter(id=>id!==keyFor(s.id)):[keyFor(s.id),...pins()];localStorage.setItem('beauty.pins',JSON.stringify(next));setPins(next);},'beauty-icon-only beauty-pin');pin.setAttribute('aria-pressed',String(pinned));row.classList.toggle('beauty-pinned',pinned);row.append(pin);list.append(row);
      const remove=beautyButton('删除会话','trash',()=>{
        const ctx=home.server.focusedContext();if(!ctx||!conn)return;
        beautyConfirmDelete(s.title||'新聊天',async()=>{
          const [store,setStore]=ctx.sync.child(s.directory);
          const ids=new Set([s.id]);let changed=true;
          while(changed){changed=false;for(const item of store.session||[]){if(ids.has(item.parentID)&&!ids.has(item.id)){ids.add(item.id);changed=true;}}}
          await ctx.sdk.api.session.remove({sessionID:s.id,directory:s.directory});
          setStore(produce(draft=>{draft.session=draft.session.filter(item=>!ids.has(item.id));}));
          for(const id of ids)ctx.sync.homeSessions.remove(id);
          notifySessionTabsRemoved({server:ServerConnection.key(conn),directory:s.directory,sessionIDs:[...ids]});
        });
      },'beauty-icon-only beauty-delete');
      pin.remove();
      const more=beautyButton('会话操作','more',()=>openSessionMenu(more,s,pin,remove),'beauty-icon-only beauty-session-more');more.setAttribute('aria-haspopup','menu');more.setAttribute('aria-expanded','false');row.append(more);
      button.addEventListener('contextmenu',event=>{event.preventDefault();openSessionMenu(more,s,pin,remove);});
    };
    if(filter||all){
      const filtered=records.filter(r=>!filter || (r.session.title+' '+r.projectName).toLowerCase().includes(filter));
      filtered.forEach(r=>addSession(r,false));
      if(!filtered.length)list.append(beautyElement('p','beauty-empty',sessions.data.loading()?'正在加载…':'暂无聊天'));
    } else {
      for(const project of projectList){
        const name=names[project.worktree]||project.name||getFilename(project.worktree);const row=beautyElement('div','beauty-project-row');
        const toggleProject=()=>{const next=new Set(folded());next.has(project.worktree)?next.delete(project.worktree):next.add(project.worktree);setFolded(next);};
        const button=beautyButton(name,folds.has(project.worktree)?'folderClosed':'folderOpen',toggleProject,'beauty-project');button.setAttribute('aria-expanded',String(!folds.has(project.worktree))); 
        button.title=project.worktree;row.append(button);
        const fold=beautyButton(folds.has(project.worktree)?'展开聊天':'折叠聊天','chevron',toggleProject,'beauty-icon-only beauty-fold');fold.classList.toggle('beauty-fold-open',!folds.has(project.worktree));row.append(fold);list.append(row);
        const more=beautyButton('项目菜单','more',()=>openProjectMenu(more,project,conn),'beauty-icon-only beauty-project-more');more.setAttribute('aria-haspopup','menu');more.setAttribute('aria-expanded','false');row.append(more);
        const childrenStart=list.children.length;
        const drafts=tabs.store.filter(t=>t.type==='draft' && beautyProjectContains(project,t.directory) && (!conn || t.server===ServerConnection.key(conn)));
        for(const draft of drafts){
          const row=beautyElement('div','beauty-project-row');
          const button=beautyButton('新聊天 · 草稿','edit',()=>tabs.select(draft),'beauty-session beauty-session-nested beauty-draft-tab');
          button.classList.toggle('beauty-selected',current.draftID===draft.draftID);row.append(button);
          const close=beautyButton('关闭草稿','plus',()=>{const index=tabs.store.findIndex(t=>t.type==='draft'&&t.draftID===draft.draftID);if(index>=0)tabs.closeTab(index);},'beauty-icon-only beauty-fold beauty-draft-close');row.append(close);list.append(row);
        }
        const own=records.filter(r=>beautyProjectContains(project,r.session.directory)).slice(0,8);
        own.forEach(r=>addSession(r,true));
        if(!own.length && !drafts.length)list.append(beautyElement('p','beauty-empty beauty-session-nested',sessions.data.loading()?'正在加载…':'暂无聊天'));
        const group=beautyElement('div','beauty-section-content');group.dataset.beautyProjectContent=project.worktree;
        const inner=beautyElement('div','beauty-section-inner');group.append(inner);
        for(const child of [...list.children].slice(childrenStart))inner.append(child);
        group.classList.toggle('beauty-section-collapsed',folds.has(project.worktree));group.inert=folds.has(project.worktree);list.append(group);
      }
      if(!projectList.length)list.append(beautyButton('打开项目','folder',()=>{if(conn)projects.project.choose(conn);}));
      if(view()==='home'){const heading=sectionTitle('最近聊天','recent');heading.classList.add('beauty-recent');list.append(heading);records.slice(0,12).forEach(r=>addSession(r,false));if(!records.length)list.append(beautyElement('p','beauty-empty','暂无聊天'));}
    }
    if(!filter){
      let content;const closed=untrack(collapsedSections);
      for(const child of [...list.children]){
        if(child.dataset.beautySection){
          const group=beautyElement('div','beauty-section-content');group.dataset.beautySectionContent=child.dataset.beautySection;
          content=beautyElement('div','beauty-section-inner');group.append(content);child.after(group);
          group.classList.toggle('beauty-section-collapsed',closed.has(child.dataset.beautySection));group.inert=closed.has(child.dataset.beautySection);
        }else if(content)content.append(child);
      }
    }
    highlightCurrentSession();
  });
  createEffect(()=>{
    const closed=collapsedSections();
    for(const group of list.querySelectorAll('[data-beauty-section-content]')){
      const collapsed=closed.has(group.dataset.beautySectionContent);
      group.classList.toggle('beauty-section-collapsed',collapsed);group.inert=collapsed;
      const toggle=group.previousElementSibling?.querySelector('.beauty-section-toggle');
      if(toggle){toggle.setAttribute('aria-expanded',String(!collapsed));toggle.classList.toggle('beauty-section-open',!collapsed);}
    }
    highlightCurrentSession();
  });
  createEffect(()=>{
    const folds=folded();
    for(const group of list.querySelectorAll('[data-beauty-project-content]')){
      const closed=folds.has(group.dataset.beautyProjectContent);
      group.classList.toggle('beauty-section-collapsed',closed);group.inert=closed;
      const row=group.previousElementSibling;
      const projectButton=row?.querySelector('.beauty-project');
      projectButton?.setAttribute('aria-expanded',String(!closed));
      if(projectButton?.firstElementChild)projectButton.firstElementChild.outerHTML=beautyIcon(closed?'folderClosed':'folderOpen');
      const toggle=row?.querySelector('.beauty-fold');
      if(toggle){toggle.classList.toggle('beauty-fold-open',!closed);toggle.title=closed?'展开聊天':'折叠聊天';toggle.setAttribute('aria-label',toggle.title);}
    }
    highlightCurrentSession();
  });
  // Changes only decorative nodes outside Solid's managed editor subtree.
  const decorate=()=>{
    const main=document.querySelector('#root main'); if(!main)return;
    main.dataset.beautyMain='';
    const frame=main.firstElementChild;if(frame)frame.dataset.beautyFrame='';
    const editor=main.querySelector('[data-component="prompt-input"]');
    const form=editor?.closest('form');
    const dock=main.querySelector('[data-component="session-prompt-dock"]');if(dock?.parentElement)dock.parentElement.dataset.beautyChatPanel='';
    for(const anchor of [main.querySelector('.beauty-home'),editor?.closest('form')?.parentElement,main.querySelector('[data-component="session-turn"]')]){
      for(let el=anchor;el&&el!==main;el=el.parentElement)el.dataset.beautyWallpaperSurface='';
    }
    if(form){
      const send=form.querySelector('button[data-action="prompt-submit"],button[data-component="icon-button-v2"][type="submit"],button[type="submit"],button[data-icon="arrow-up"]');if(send)send.dataset.beautySend='';
    }
    const draftRoot=main.querySelector('[data-component="session-new-design"]');
    const logo=draftRoot?.querySelector('svg[viewBox="0 0 720 129"]');
    if(draftRoot && logo){
      draftRoot.dataset.beautyDraft='';
      const outer=logo.parentElement.parentElement;
      outer.dataset.beautyDraftContent='';
      logo.dataset.beautyLogo='';
      const controls=logo.nextElementSibling;
      if(controls)controls.dataset.beautyDraftControls='';
      let hero=draftRoot.querySelector('.beauty-welcome');
      if(!hero){
        hero=beautyElement('div','beauty-welcome');hero.append(beautyWordmark());
        hero.append(beautyElement('h1'));draftRoot.append(hero);
      }
      const route=untrack(()=>layout.route());const draft=untrack(()=>tabs.store.find(t=>t.type==='draft'&&t.draftID===route.draftID));
      const heading=hero.querySelector('h1');const text=draft?.directory?'我们应该在 '+getFilename(draft.directory)+' 中做些什么？':'我们开始做点什么？';
      if(heading.textContent!==text)heading.textContent=text;
    }
  };
  let scheduled=false;
  const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate();});});
  onMount(()=>{observer.observe(document.getElementById('root'),{childList:true,subtree:true});decorate();});
  onCleanup(()=>observer.disconnect());
}
function beautyRead(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
// Store the image itself so moving or deleting the source file does not break the wallpaper.
function beautyWallpaperInit(){
  if(window.beautyWallpaper)return window.beautyWallpaper;
  let database,url,name='',mounted=false,record=null,blobURL=null;
  const open=()=>database??=new Promise((resolve,reject)=>{
    const request=indexedDB.open('beauty-appearance',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('wallpaper');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=null;reject(Error('无法打开壁纸存储'));};
  });
  const transaction=async(mode,action)=>{
    const db=await open();return new Promise((resolve,reject)=>{
      const tx=db.transaction('wallpaper',mode);const request=action(tx.objectStore('wallpaper'));
      tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(Error('壁纸保存失败，请检查磁盘空间'));
    });
  };
  const display=next=>{
    record=next;
    if(blobURL)URL.revokeObjectURL(blobURL);blobURL=null;
    const presets=beautyPresetInit(),custom=record&&localStorage.getItem('beauty.wallpaper-source')!=='preset';
    if(custom)blobURL=URL.createObjectURL(record.image);
    url=custom?blobURL:presets.image(presets.current());name=custom?record.name:(url?presets.list().find(p=>p.id===presets.current()).name+' · 内置壁纸':'');
    document.body.classList.toggle('beauty-has-wallpaper',!!url);
    if(url)document.body.style.setProperty('--beauty-wallpaper-image','url("'+url+'")');else document.body.style.removeProperty('--beauty-wallpaper-image');
    window.dispatchEvent(new CustomEvent('beauty:wallpaper-changed',{detail:{name,url}}));
  };
  return window.beautyWallpaper={
    current:()=>({name,url,custom:!!blobURL}),
    refresh:()=>display(record),
    async mount(){if(mounted)return;mounted=true;try{display(await transaction('readonly',store=>store.get('current')));}catch{mounted=false;}},
    async set(file){
      if(!['image/png','image/jpeg','image/webp','image/gif','image/avif','image/bmp'].includes(file.type))throw Error('请选择 PNG、JPG、WebP、GIF、AVIF 或 BMP 图片');
      if(file.size>30*1024*1024)throw Error('请选择小于 30 MB 的图片');
      const check=URL.createObjectURL(file);try{const img=new Image();img.src=check;await img.decode();}catch{throw Error('无法读取这张图片，请选择有效的图片文件');}finally{URL.revokeObjectURL(check);}
      const record={image:file,name:file.name};await transaction('readwrite',store=>store.put(record,'current'));localStorage.setItem('beauty.wallpaper-source','custom');display(record);
    },
    async clear(){await transaction('readwrite',store=>store.delete('current'));display(null);}
  };
}
function beautyProjectContains(project,directory){return !!directory&&[project.worktree,...project.sandboxes||[]].some(path=>pathKey(path)===pathKey(directory));}
function beautyMergeSessions(indexed,live,removed,keyFor){
  return [...new Map([...indexed,...live].map(record=>[record.session.id,record])).values()]
    .filter(record=>!removed.has(keyFor(record.session.id)))
    .sort((a,b)=>(b.session.time?.updated||b.session.time?.created||0)-(a.session.time?.updated||a.session.time?.created||0));
}
async function beautyDeleteProjectSessions(ctx,project,server){
  const directories=[...new Map([project.worktree,...project.sandboxes||[]].map(path=>[pathKey(path),path])).values()];
  for(const directory of directories){
    const sessions=await listAllSessions(ctx.sdk.api.session,{directory,order:'desc'});
    const remaining=new Map(sessions.filter(s=>pathKey(s.directory)===pathKey(directory)).map(s=>[s.id,s]));
    while(remaining.size){
      // Delete descendants first because deleting a parent can also delete its children.
      const parents=new Set([...remaining.values()].map(s=>s.parentID).filter(Boolean));
      const session=[...remaining.values()].find(s=>!parents.has(s.id));
      if(!session)throw new Error('会话层级异常，无法删除项目');
      await ctx.sdk.api.session.remove({sessionID:session.id,directory});
      remaining.delete(session.id);
      const [,setStore]=ctx.sync.child(directory);
      setStore(produce(draft=>{draft.session=draft.session.filter(item=>item.id!==session.id);}));
      ctx.sync.homeSessions.remove(session.id);
      notifySessionTabsRemoved({server,directory,sessionIDs:[session.id]});
    }
  }
}
function beautyConfirmDelete(name,remove,title='删除会话',description='删除会话 "'+name+'"?'){
  const prior=document.activeElement;const overlay=beautyElement('div','beauty-rename-overlay');const form=beautyElement('form','beauty-rename-dialog beauty-delete-dialog');
  form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');form.setAttribute('aria-label',title);
  form.append(beautyElement('h2','',title),beautyElement('p','',description));
  const error=beautyElement('p','beauty-rename-error');form.append(error);let busy=false;
  const close=()=>{if(busy)return;overlay.remove();document.removeEventListener('keydown',keys,true);prior?.focus();};
  const cancel=beautyButton('取消','',close);const submit=beautyButton(title,'',()=>{});submit.type='submit';submit.classList.add('beauty-delete-confirm');
  const actions=beautyElement('div','beauty-rename-actions');actions.append(cancel,submit);form.append(actions);overlay.append(form);
  const keys=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){e.preventDefault();(document.activeElement===cancel?submit:cancel).focus();}};
  document.addEventListener('keydown',keys,true);document.body.append(overlay);cancel.focus();
  form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;cancel.disabled=submit.disabled=true;try{await remove();busy=false;close();}catch(err){error.textContent=err?.message||'删除失败，请重试';busy=false;cancel.disabled=submit.disabled=false;submit.focus();}});
}
function beautyRename(label,current,save){
  document.querySelector('.beauty-rename-overlay')?.remove();
  const prior=document.activeElement;const overlay=beautyElement('div','beauty-rename-overlay');const form=beautyElement('form','beauty-rename-dialog');form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');form.setAttribute('aria-label',label);
  form.append(beautyElement('h2','',label));const input=beautyElement('input','beauty-search');input.value=current;input.required=true;input.maxLength=200;input.setAttribute('aria-label',label);form.append(input);const error=beautyElement('p','beauty-rename-error');form.append(error);
  const buttons=beautyElement('div','beauty-rename-actions');let busy=false;const close=()=>{if(busy)return;overlay.remove();document.removeEventListener('keydown',keys,true);prior?.focus();};
  const cancel=beautyButton('取消','',close);const submit=beautyButton('保存','',()=>{});submit.type='submit';buttons.append(cancel,submit);form.append(buttons);overlay.append(form);document.body.append(overlay);
  const keys=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){const nodes=[input,cancel,submit].filter(x=>!x.disabled);const i=nodes.indexOf(document.activeElement);e.preventDefault();nodes[(i+(e.shiftKey?-1:1)+nodes.length)%nodes.length].focus();}};document.addEventListener('keydown',keys,true);
  form.addEventListener('submit',async e=>{e.preventDefault();const value=input.value.trim();if(!value){error.textContent='名称不能为空';return;}busy=true;input.disabled=submit.disabled=cancel.disabled=true;try{await save(value);busy=false;close();}catch(err){error.textContent=err?.message||'保存失败，请重试';busy=false;input.disabled=submit.disabled=cancel.disabled=false;input.focus();}});
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(input.isConnected){input.focus();input.select();}}));
}
