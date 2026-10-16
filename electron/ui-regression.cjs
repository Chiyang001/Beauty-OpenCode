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
      <div class="beauty-reasoning-dots"><span id="dot"></span></div>
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
