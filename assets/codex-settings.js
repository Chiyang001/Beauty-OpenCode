/* Keep native settings state, controls, focus handling and nested dialogs. */
function beautyAppearanceSection(props) {
  const section=document.createElement('section');section.className='settings-v2-section';
  const heading=document.createElement('h2');heading.className='settings-v2-section-title';heading.textContent='外观';section.append(heading);
  const list=document.createElement('div');list.dataset.component='settings-v2-list';section.append(list);
  const row=document.createElement('div');row.dataset.component='settings-v2-row';list.append(row);
  const copy=document.createElement('div');copy.dataset.slot='settings-v2-row-copy';row.append(copy);
  const title=document.createElement('label');title.dataset.slot='settings-v2-row-title';title.textContent='界面主题';copy.append(title);
  const description=document.createElement('p');description.dataset.slot='settings-v2-row-description';description.textContent='选择深色、浅色，或跟随系统外观';copy.append(description);
  const labels={system:'跟随系统',light:'浅色',dark:'深色'};
  insert(row,createComponent(SelectV2,{
    appearance:'inline',
    'data-action':'settings-color-scheme',
    'aria-label':'界面主题',
    options:['system','light','dark'],
    get current(){return props.controller.scheme.current();},
    placement:'bottom-end',gutter:6,
    label:value=>labels[value],
    onSelect:value=>value&&props.controller.scheme.select(value)
  }));
  const presetRow=document.createElement('div');presetRow.dataset.component='settings-v2-row';presetRow.className='beauty-preset-row';list.append(presetRow);
  const presetCopy=document.createElement('div');presetCopy.dataset.slot='settings-v2-row-copy';presetRow.append(presetCopy);
  const presetTitle=document.createElement('div');presetTitle.dataset.slot='settings-v2-row-title';presetTitle.textContent='主题风格';presetCopy.append(presetTitle);
  const presetHint=document.createElement('p');presetHint.dataset.slot='settings-v2-row-description';presetHint.textContent='选择配套的界面配色和背景，默认使用原有风格';presetCopy.append(presetHint);
  const gallery=document.createElement('div');gallery.className='beauty-theme-gallery';gallery.setAttribute('role','group');gallery.setAttribute('aria-label','主题风格');presetCopy.append(gallery);
  const presets=window.beautyPresets;
  for(const preset of presets.list()){
    const card=document.createElement('button');card.type='button';card.className='beauty-theme-card';card.dataset.preset=preset.id;card.setAttribute('aria-label',preset.name);
    const image=presets.image(preset.id);if(image){const thumbnail=document.createElement('img');thumbnail.src=image;thumbnail.alt='';thumbnail.loading='lazy';card.append(thumbnail);}else{const thumbnail=document.createElement('span');thumbnail.className='beauty-theme-default';thumbnail.textContent='OpenCode';card.append(thumbnail);}
    const label=document.createElement('span');label.className='beauty-theme-label';label.textContent=preset.name;card.append(label);
    card.addEventListener('click',()=>{try{presets.select(preset.id);}catch(error){presetHint.textContent='无法保存主题：'+error.message;}});gallery.append(card);
  }
  const updatePreset=()=>{for(const card of gallery.children)card.setAttribute('aria-pressed',String(card.dataset.preset===presets.current()));};updatePreset();
  window.addEventListener('beauty:preset-changed',updatePreset);onCleanup(()=>window.removeEventListener('beauty:preset-changed',updatePreset));
  const wallpaper=document.createElement('div');wallpaper.dataset.component='settings-v2-row';wallpaper.className='beauty-wallpaper-row';list.append(wallpaper);
  const details=document.createElement('div');details.dataset.slot='settings-v2-row-copy';wallpaper.append(details);
  const wallpaperTitle=document.createElement('div');wallpaperTitle.dataset.slot='settings-v2-row-title';wallpaperTitle.textContent='主界面壁纸';details.append(wallpaperTitle);
  const hint=document.createElement('p');hint.dataset.slot='settings-v2-row-description';hint.textContent='自定义图片会替换当前主题背景；清除后恢复内置背景';details.append(hint);
  const preview=document.createElement('img');preview.className='beauty-wallpaper-preview';preview.alt='当前壁纸预览';details.append(preview);
  const message=document.createElement('p');message.className='beauty-wallpaper-message';message.setAttribute('role','status');details.append(message);
  const actions=document.createElement('div');actions.className='beauty-wallpaper-actions';wallpaper.append(actions);
  const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp';input.hidden=true;input.setAttribute('aria-label','选择壁纸图片');actions.append(input);
  const choose=document.createElement('button');choose.type='button';choose.className='beauty-button beauty-wallpaper-choose';choose.textContent='选择图片';choose.addEventListener('click',()=>input.click());actions.append(choose);
  const clear=document.createElement('button');clear.type='button';clear.className='beauty-button';clear.textContent='清除壁纸';actions.append(clear);
  const update=()=>{const {name,url,custom}=window.beautyWallpaper.current();preview.hidden=!url;if(url)preview.src=url;else preview.removeAttribute('src');clear.disabled=!custom;choose.textContent=url?'更换图片':'选择图片';message.textContent=name||'未设置壁纸';};
  let busy=false;
  const run=async(action)=>{if(busy)return;busy=true;choose.disabled=clear.disabled=true;message.textContent='正在保存…';try{await action();update();}catch(error){update();message.textContent=error.message;}finally{busy=false;choose.disabled=false;clear.disabled=!window.beautyWallpaper.current().custom;input.value='';}};
  input.addEventListener('change',()=>{const file=input.files[0];if(file)void run(()=>window.beautyWallpaper.set(file));});
  clear.addEventListener('click',()=>void run(()=>window.beautyWallpaper.clear()));
  update();window.addEventListener('beauty:wallpaper-changed',update);onCleanup(()=>window.removeEventListener('beauty:wallpaper-changed',update));
  return section;
}
function beautySettingsPage(dialog) {
  let root, observer, search, query='';
  const filter=()=>{
    if(!root)return;
    const q=query.trim().toLowerCase();
    for(const row of root.querySelectorAll('[data-component="settings-v2-row"]')) row.classList.toggle('beauty-settings-filtered',!!q&&!row.textContent.toLowerCase().includes(q));
    for(const section of root.querySelectorAll('.settings-v2-section')) {
      const rows=[...section.querySelectorAll('[data-component="settings-v2-row"]')];
      section.classList.toggle('beauty-settings-filtered',!!q&&rows.length>0&&rows.every(r=>r.classList.contains('beauty-settings-filtered')));
    }
    for(const trigger of root.querySelectorAll('[data-slot="tabs-v2-trigger"]'))trigger.classList.toggle('beauty-search-match',!!q&&trigger.textContent.toLowerCase().includes(q));
  };
  onMount(()=>{
    root=[...document.querySelectorAll('.settings-v2-dialog')].at(-1);if(!root)return;
    const nav=root.querySelector('[data-slot="tabs-v2-list"]');if(!nav)return;
    const header=document.createElement('div');header.className='beauty-settings-head';
    const title=document.createElement('h1');title.textContent='设置';header.append(title);
    search=document.createElement('input');search.type='search';search.placeholder='搜索设置';search.setAttribute('aria-label','搜索设置');search.className='beauty-settings-search';
    search.addEventListener('input',()=>{query=search.value;filter();});header.append(search);nav.prepend(header);
    const back=document.createElement('button');back.type='button';back.className='beauty-settings-back';back.textContent='‹ 返回聊天';back.addEventListener('click',()=>dialog.close());nav.append(back);
    const rail=document.createElement('nav');rail.className='beauty-settings-rail';rail.setAttribute('aria-label','设置导航');
    const home=document.createElement('button');home.type='button';home.title='返回聊天';home.setAttribute('aria-label','返回聊天');home.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/></svg>';home.addEventListener('click',()=>dialog.close());rail.append(home);root.append(rail);
    observer=new MutationObserver(filter);observer.observe(root,{childList:true,subtree:true});filter();
    onCleanup(()=>{observer?.disconnect();header.remove();back.remove();rail.remove();});
  });
}
