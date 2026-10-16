function beautyPresetInit(){
  if(window.beautyPresets)return window.beautyPresets;
  // Each palette: canvas, rail, surface, hover, border, muted text, text, accent, bubble.
  const presets=[
    {id:'default',name:'默认'},
    {id:'cyber',name:'赛博 · Cyber',light:['#edf4ff','#dfeafb','#f1f5ff','#d8e3fa','#b3c6e6','#526580','#172640','#a923aa','#683276'],dark:['#091322','#0b192d','#13253d','#1d3451','#2a4766','#95b8d3','#e0f4ff','#d552d5','#643267']},
    {id:'wind',name:'清风 · Wind',light:['#f4fcfa','#e6f4f1','#eef8f5','#d7ece6','#b9d9cf','#507469','#173e35','#297c68','#307b6b'],dark:['#101f1c','#122722','#1c332c','#28483e','#385c50','#9cbfb2','#e0f3eb','#65b79f','#2f6c5a']},
    {id:'forest',name:'森林 · Forest',light:['#f1f6ec','#e2ecda','#eaf1e3','#d3e3c8','#b5cba6','#59754d','#243b1d','#477a32','#45723a'],dark:['#102116','#10281a','#1c3523','#294b30','#3c6241','#a1bf9b','#e1efdc','#91ba68','#426336']},
    {id:'latte',name:'拿铁 · Latte',light:['#fff8ed','#f3e7d5','#faf0e0','#ead8be','#d5bfa0','#876f54','#493423','#97633a','#906039'],dark:['#261e18','#30251d','#3c2d22','#503c2d','#6e5140','#c9af92','#f5e6d3','#d0a475','#815b39']},
    {id:'midnight',name:'午夜 · Midnight',light:['#f0f3fb','#e2e8f5','#eaf0fa','#d2ddf2','#afbfdf','#5b6d91','#24324f','#466db6','#466297'],dark:['#0c1426','#101b32','#1a2843','#26385a','#3b527c','#9daecc','#e6edff','#83a4eb','#3c568b']},
    {id:'mono',name:'黑白 · Mono',light:['#fafafa','#efefef','#f4f4f4','#e2e2e2','#cacaca','#696969','#242424','#515151','#555555'],dark:['#161616','#1d1d1d','#282828','#363636','#505050','#adadad','#ededed','#b0b0b0','#505050']},
    {id:'ocean',name:'海洋 · Ocean',light:['#edf8ff','#deeff9','#e8f5fc','#cce5f5','#aacde3','#4d768d','#183b50','#237bad','#276f9a'],dark:['#0b1d2d','#10283c','#19364d','#244e68','#386782','#9fc6d7','#dff6ff','#62b4e1','#2b688f']},
    {id:'sakura',name:'樱花 · Sakura',light:['#fff5f8','#f9e8ef','#fceef3','#f1d7e3','#ddb5c7','#936777','#512d3c','#b54b79','#ab5478'],dark:['#291921','#34202b','#432b38','#573847','#765062','#cda8b9','#ffe6f1','#e595b5','#904a68']}
  ];
  let selected=localStorage.getItem('beauty.preset')||'default',mode='dark';
  if(!presets.some(p=>p.id===selected))selected='default';
  const keys=new Set();
  for(const sheet of document.styleSheets){try{const walk=rules=>{for(const rule of rules){if(rule.style)for(const key of rule.style)if(key.startsWith('--beauty-c-'))keys.add(key);if(rule.cssRules)walk(rule.cssRules);}};walk(sheet.cssRules);}catch{}}
  const apply=nextMode=>{
    mode=nextMode;const root=document.documentElement;root.dataset.beautyPreset=selected;
    for(const key of keys){root.style.removeProperty(key);document.body.style.removeProperty(key);}
    for(const key of ['--beauty-accent','--beauty-button-on-accent','--beauty-bubble','--beauty-wallpaper-shade'])root.style.removeProperty(key);
    const preset=presets.find(p=>p.id===selected);if(selected==='default')return;
    const [base,rail,surface,hover,border,muted,text,accent,bubble]=preset[mode];
    for(const key of keys){
      let color;const hex=key.slice('--beauty-c-'.length);
      const expanded=hex.length===3?[...hex].map(c=>c+c).join(''):hex;
      const r=parseInt(expanded.slice(0,2),16),g=parseInt(expanded.slice(2,4),16),b=parseInt(expanded.slice(4,6),16);
      if(expanded.length===8)color=mode==='light'?'#0000000c':'#ffffff0c';
      else if(Math.max(r,g,b)-Math.min(r,g,b)>18)color=['ffaaa0','49302e','38302f'].includes(hex)?(hex==='ffaaa0'?'#d56a70':surface):accent;
      else{const level=(r+g+b)/3;color=level<27?base:level<34?rail:level<43?surface:level<57?hover:level<90?border:level<205?muted:text;}
      root.style.setProperty(key,color);
    }
    const channels=[1,3,5].map(offset=>{const value=parseInt(accent.slice(offset,offset+2),16)/255;return value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4);});
    const luminance=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
    root.style.setProperty('--beauty-button-on-accent',luminance>.179?'#111111':'#ffffff');
    root.style.setProperty('--beauty-accent',accent);root.style.setProperty('--beauty-bubble',bubble);
    root.style.setProperty('--beauty-wallpaper-shade',mode==='light'?base+'b3':base+'99');
    window.api?.setBackgroundColor(rail);
  };
  return window.beautyPresets={
    list:()=>presets,current:()=>selected,
    image:id=>id==='default'?null:new URL('./assets/beauty-themes/'+id+'.png',document.baseURI).href,
    apply,
    select(id){if(!presets.some(p=>p.id===id))return;localStorage.setItem('beauty.preset',id);localStorage.setItem('beauty.wallpaper-source','preset');selected=id;apply(mode);window.beautyWallpaper?.refresh();window.dispatchEvent(new Event('beauty:preset-changed'));}
  };
}
