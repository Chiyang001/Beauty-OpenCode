// Run with Electron: verify the real theme patches through Chromium's CSS cascade.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1000, height: 800,
    webPreferences: { backgroundThrottling: false, offscreen: true } });
  win.webContents.on('console-message', event => {
    if (event.level === 'error') console.error(event.message);
  });
  try {
    const patches = ['codex.css', 'codex-v2.css'].map(name =>
      fs.readFileSync(path.join(__dirname, '..', 'assets', name), 'utf8')).join('\n');
    const baseline = `
      :root{--surface-base-hover:#ddd;--text-weak:#aaa}
      [data-component=collapsed-tool-group]>[data-component=collapsible].tool-collapsible>[data-slot=collapsible-trigger][aria-expanded=true]{position:sticky;top:0;background-color:white}
      #themedNative{background-image:linear-gradient(var(--v2-background-bg-contrast),var(--v2-background-bg-contrast));color:var(--v2-text-text-contrast)}
      [data-component="button-v2"],[data-component="icon-button-v2"]{
        background-image:linear-gradient(rgb(20,30,40),rgb(50,60,70));color:rgb(250,250,250)}
      [data-slot="user-message-body"]{background:rgb(210,220,230);color:rgb(10,20,30);border-radius:7px}
      [data-slot="user-message-body"][data-pending]{background:rgb(180,190,200);color:rgb(40,50,60)}
    `;
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html>
      <html data-beauty-theme="light"><head><style>${baseline}</style><style>${patches}</style></head>
      <body data-beauty="codex-v2"><div role="dialog">
      <button id="primary" data-component="button-v2" data-variant="primary">Primary</button>
      <button id="contrast" data-component="button-v2" data-variant="contrast">Contrast</button>
      <button id="accent" data-component="button-v2" data-variant="accent">Accent</button>
      <button id="submit" data-component="icon-button-v2" data-variant="contrast">Submit</button></div>
      <button id="themedNative" data-component="button-v2" data-variant="contrast">Continue in the browser</button>
      <div id="bubble" data-slot="user-message-body"><div id="bubbleText" data-slot="user-message-text">Message</div></div>
      <div data-session-title><div id="chatHeader" style="background:white">Chat</div></div>
      <div class="beauty-project-row"><button class="beauty-button beauty-project"><svg></svg><span id="projectLabel">Desktop</span></button></div>
      <div class="beauty-chat-row"><button id="sessionButton" class="beauty-button beauty-session beauty-session-nested beauty-selected"><span class="beauty-session-status"></span><span id="sessionLabel">Chat</span></button></div>
      <div id="pending" data-slot="user-message-body" data-pending>Pending</div>
      <div data-component="collapsed-tool-group"><div data-component="collapsible" class="tool-collapsible"><button id="thoughtSummary" data-slot="collapsible-trigger" aria-expanded="true">使用了 1 个思考</button></div></div>
      <div class="beauty-reasoning-title" id="strength">High</div>
      <div class="beauty-reasoning-dots"><span id="dot"></span></div><div class="beauty-reasoning-particle" id="bubbleParticle"></div>
      <aside class="beauty-shell"><nav class="beauty-rail"></nav><section class="beauty-sidebar">
      <div class="beauty-sidebar-list">Sessions</div></section><div class="beauty-sidebar-resize" hidden></div></aside>
      </body></html>`));
    for (const theme of ['light', 'dark']) {
      const result = await win.webContents.executeJavaScript(`(() => {
        document.documentElement.dataset.beautyTheme=${JSON.stringify(theme)};
        const css=id=>getComputedStyle(document.getElementById(id));
        return {
          buttons:['primary','contrast','accent','submit'].map(id=>css(id).backgroundImage),
          bubble:[css('bubble').backgroundColor,css('bubble').color,css('bubble').borderRadius],
          pending:[css('pending').backgroundColor,css('pending').color],
          strength:css('strength').color,dot:css('dot').backgroundColor,
          thoughtBackground:css('thoughtSummary').backgroundColor,thoughtPosition:css('thoughtSummary').position,
          bubbleRadius:css('bubbleText').borderRadius,header:css('chatHeader').backgroundColor,
          indent:Math.abs(document.getElementById('projectLabel').getBoundingClientRect().left-document.getElementById('sessionLabel').getBoundingClientRect().left),
          selectedDecoration:getComputedStyle(document.getElementById('sessionButton'),'::before').content,
          gutter:getComputedStyle(document.querySelector('.beauty-sidebar-list')).scrollbarGutter,
          hiddenHandle:getComputedStyle(document.querySelector('.beauty-sidebar-resize')).display
        };
      })()`);
      assert(result.buttons.every(value => value.startsWith('linear-gradient(')), `${theme}: native button gradients`);
      assert.deepEqual(result.bubble, ['rgb(210, 220, 230)', 'rgb(10, 20, 30)', '7px']);
      assert.deepEqual(result.pending, ['rgb(180, 190, 200)', 'rgb(40, 50, 60)']);
      assert.equal(result.strength, 'rgb(52, 120, 207)', 'Accent fallback without a preset');
      assert.equal(result.dot, 'rgb(255, 255, 255)');
      assert.equal(result.thoughtBackground,'rgba(0, 0, 0, 0)');assert.equal(result.thoughtPosition,'sticky');
      assert.equal(result.bubbleRadius,'24px');assert.equal(result.header,'rgba(0, 0, 0, 0)');
      assert(result.indent<1,'Session and project labels align');assert.equal(result.selectedDecoration,'none');
      assert.equal(result.gutter, 'stable');
      assert.equal(result.hiddenHandle, 'none');
    }
    const themedButton=await win.webContents.executeJavaScript(`(() => {
      document.documentElement.style.setProperty('--beauty-accent','#e595b5');
      document.documentElement.style.setProperty('--beauty-button-on-accent','#111111');
      const css=getComputedStyle(document.getElementById('themedNative'));
      const result={background:css.backgroundImage,color:css.color};
      document.documentElement.style.removeProperty('--beauty-accent');
      document.documentElement.style.removeProperty('--beauty-button-on-accent');return result;
    })()`);
    assert(themedButton.background.includes('rgb(229, 149, 181)'), 'Native contrast button follows the selected accent');
    assert.equal(themedButton.color,'rgb(17, 17, 17)', 'Light accents support a readable dark foreground');
    const drift = await win.webContents.executeJavaScript(`(() => {
      const node=document.getElementById('bubbleParticle'),animation=node.getAnimations()[0];
      const css=getComputedStyle(node);const result={timing:css.animationTimingFunction,duration:parseFloat(css.animationDuration),opacity:[],left:[]};
      animation.pause();for(const time of [250,750,1250]){animation.currentTime=time;const frame=getComputedStyle(node);result.opacity.push(Number(frame.opacity));result.left.push(parseFloat(frame.left));}return result;
    })()`);
    assert.equal(drift.timing,'linear');assert(drift.duration>=2.5&&drift.duration<=3.5,'Bubbles use a moderate drift');
    assert(Math.max(...drift.opacity)-Math.min(...drift.opacity)<.01,'Bubble opacity stays steady');
    assert(Math.abs((drift.left[0]-drift.left[1])-(drift.left[1]-drift.left[2]))<1,'Bubble motion has no acceleration spike');
    for (const width of [240, 312, 600]) {
      const size = await win.webContents.executeJavaScript(`(() => {
        document.body.style.setProperty('--beauty-sidebar-width','${width}px');
        const shell=document.querySelector('.beauty-shell');shell.style.transition='none';
        return {shell:shell.getBoundingClientRect().width,sidebar:document.querySelector('.beauty-sidebar').getBoundingClientRect().width};
      })()`);
      assert.equal(size.shell, width);
      assert(size.sidebar > 100 && size.sidebar < width);
    }
    await win.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, '..', 'assets', 'codex-shell.js'), 'utf8'));
    await win.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, '..', 'assets', 'codex-native-bridge.js'), 'utf8'));
    const reasoning = await win.webContents.executeJavaScript(`(() => {
      window.createEffect=fn=>fn();window.onCleanup=()=>{};
      let selected='high',opened=0;const values=['default','low','high','max'];
      const control={options:()=>values.map(id=>({id})),current:()=>selected,onSelect:id=>{selected=id;}};
      const trigger=beautyReasoningSlider(control,{name:()=> 'GPT-6.1 Sol',open:()=>opened++});document.body.append(trigger);
      const entryPanels=[];
      for(const selector of ['.beauty-composer-model','.beauty-composer-strength','.beauty-reasoning-arrow']){
        trigger.querySelector(selector).click();entryPanels.push(!!document.querySelector('.beauty-reasoning-range')&&opened===0);
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      }
      trigger.querySelector('.beauty-composer-strength').click();
      let popup=document.querySelector('.beauty-reasoning-panel');
      const title=popup.querySelector('.beauty-reasoning-title'),caption=popup.querySelector('.beauty-reasoning-model-caption');
      const oneButton=title.closest('button')===caption.closest('button');
      const icons=popup.querySelectorAll('.beauty-reasoning-symbol,.beauty-composer-lightning').length+trigger.querySelectorAll('.beauty-composer-lightning').length;
      const ticks=[...popup.querySelectorAll('.beauty-reasoning-dots span')],range=popup.querySelector('input');
      const covered=ticks.map(n=>getComputedStyle(n).visibility),before=ticks.map(n=>n.getBoundingClientRect().left);
      range.value='1';range.dispatchEvent(new Event('input'));const lower=ticks.map(n=>getComputedStyle(n).visibility);
      const after=ticks.map(n=>n.getBoundingClientRect().left);
      range.value='3';range.dispatchEvent(new Event('input'));const highest=ticks.map(n=>getComputedStyle(n).visibility);
      range.value='2';range.dispatchEvent(new Event('input'));
      const particles=[...popup.querySelectorAll('.beauty-reasoning-particle')],clip=popup.querySelector('.beauty-reasoning-particles');
      const animations=particles.map(n=>n.getAnimations()[0]);animations.forEach(a=>a.pause());
      let minimum=Infinity,maxGap=0;
      for(let time=0;time<=6400;time+=80){
        animations.forEach(a=>{a.currentTime=time;});const box=clip.getBoundingClientRect();
        const positions=particles.map(n=>n.getBoundingClientRect()).filter(r=>r.right>box.left&&r.left<box.right).map(r=>Math.max(0,r.left-box.left)).sort((a,b)=>a-b);
        minimum=Math.min(minimum,positions.length);const points=[0,...positions,box.width];
        for(let i=1;i<points.length;i++)maxGap=Math.max(maxGap,points[i]-points[i-1]);
      }
      const streamWidth=clip.getBoundingClientRect().width;
      title.click();const titleOpened=opened===1&&!document.querySelector('.beauty-reasoning-panel');
      trigger.querySelector('.beauty-composer-strength').click();
      document.querySelector('.beauty-reasoning-model-caption').click();const captionOpened=opened===2&&!document.querySelector('.beauty-reasoning-panel');
      const native=document.createElement('button');native.dataset.beautyModelButton='';native.textContent='Big Pickle';document.body.append(native);
      const prefix=getComputedStyle(native,'::before').content;native.remove();
      const tip=document.createElement('div');tip.dataset.component='new-session-tip';tip.textContent='75 providers';document.body.append(tip);
      const tipDisplay=getComputedStyle(tip).display;tip.remove();trigger.remove();
      return {entryPanels,oneButton,icons,covered,lower,highest,before,after,minimum,maxGap,streamWidth,titleOpened,captionOpened,prefix,tipDisplay};
    })()`);
    assert(reasoning.oneButton&&reasoning.titleOpened&&reasoning.captionOpened,'Both header lines share one clickable model control');
    assert.deepEqual(reasoning.entryPanels,[true,true,true],'Model name, strength and arrow all open the reasoning panel');
    assert.equal(reasoning.icons,0);assert.equal(reasoning.prefix,'none');assert.equal(reasoning.tipDisplay,'none');
    assert.deepEqual(reasoning.covered,['hidden','hidden','hidden','visible']);
    assert.deepEqual(reasoning.lower,['hidden','hidden','visible','visible']);
    assert.deepEqual(reasoning.highest,['hidden','hidden','hidden','hidden']);assert.deepEqual(reasoning.before,reasoning.after);
    assert(reasoning.minimum>=8,'Irregular bubble stream stays populated across repeated wraps: '+JSON.stringify(reasoning));
    assert(reasoning.maxGap<reasoning.streamWidth*.5,'Bubble stream does not form a large empty gap');
    const selectAlignment = await win.webContents.executeJavaScript(`(() => {
      window.createEffect=fn=>fn();window.onCleanup=()=>{};
      const screen=document.createElement('section');screen.className='settings-screen';document.body.append(screen);
      const results=[];
      for(const value of ['light','dark','system']){
        const trigger=beautyNativeSchemeSelect({current:()=>value,select(){}},{light:'浅色',dark:'深色',system:'跟随系统'});
        screen.append(trigger);
        const label=trigger.firstElementChild.getBoundingClientRect(),icon=trigger.querySelector('svg').getBoundingClientRect();
        results.push({value,offset:Math.abs(label.top+label.height/2-icon.top-icon.height/2),right:icon.left>=label.right});
      }
      screen.remove();return results;
    })()`);
    for(const result of selectAlignment){
      assert(result.offset < 1, result.value+': dropdown icon is vertically centered');
      assert(result.right, result.value+': dropdown icon stays after the label');
    }
    const timeline = await win.webContents.executeJavaScript(`(async () => {
      const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
      const root=document.createElement('div');root.id='root';
      root.innerHTML='<div class="scroll-view__viewport" style="height:150px;overflow:auto"><div data-timeline-row="UserMessage" data-message-id="first" style="height:100px">First</div><div data-timeline-row="UserMessage" data-message-id="second" style="height:100px">Second</div><div id="stream" style="height:800px"></div></div>';
      document.body.append(root);
      let measured=0;
      let mutations=0,frames=0;
      const OriginalObserver=window.MutationObserver,originalRAF=window.requestAnimationFrame;
      window.MutationObserver=class extends OriginalObserver{constructor(callback){super((...args)=>{mutations++;callback(...args);});}};
      window.requestAnimationFrame=callback=>originalRAF.call(window,time=>{frames++;callback(time);});
      for(const row of root.querySelectorAll('[data-message-id]')){
        const rect=row.getBoundingClientRect.bind(row);
        row.getBoundingClientRect=()=>{measured++;return rect();};
      }
      const dispose=beautyTimelineMount();
      // Offscreen Chromium may take longer to produce its first frame under load.
      const deadline=performance.now()+3000;
      while(measured<2&&performance.now()<deadline)await wait(20);
      const initial=measured;
      root.firstElementChild.scrollTop=50;root.firstElementChild.dispatchEvent(new Event('scroll',{bubbles:true}));await wait(60);
      const scrolled=measured;
      const output=root.querySelector('#stream');
      for(let i=0;i<18;i++){output.textContent='token '+i;await wait(20);}
      const streamed=measured,marks=document.querySelectorAll('.beauty-timeline-mark').length;
      dispose();const disposed=measured;await wait(180);root.remove();
      window.MutationObserver=OriginalObserver;window.requestAnimationFrame=originalRAF;
      return {initial,scrolled,streamed,marks,disposed,afterDispose:measured,mutations,frames};
    })()`);
    assert(timeline.initial >= 2, 'Timeline measures initial message positions');
    assert.equal(timeline.scrolled, timeline.initial, 'Scrolling reuses cached row positions');
    assert(timeline.streamed > timeline.scrolled, 'Continuous streaming does not starve timeline refresh: '+JSON.stringify(timeline));
    assert(timeline.streamed - timeline.scrolled <= 8, 'Streaming layout reads stay bounded');
    assert.equal(timeline.marks, 2);
    assert.equal(timeline.afterDispose, timeline.disposed, 'Disposal cancels pending refresh');
    console.log('Chromium UI regressions passed: native colors, pending state, slider contrast, scrollbar, sidebar widths and streaming timeline');
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
