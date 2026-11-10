// Run with Electron. Exercise 2.2's real CSS, including chunks loaded after the patch.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Archive } = require('./asar.cjs');
const patch = require('./patch.cjs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1440, height: 900,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    const installed = patch.paths(patch.defaultFolder);
    const arc = new Archive(fs.existsSync(installed.b) ? installed.b : installed.a);
    const names = [...arc.index.keys()].filter(n => /^out\/renderer\/assets\/.*\.css$/.test(n));
    const main = names.find(n => /\/main-/.test(n));
    const dynamic = names.filter(n => n !== main && /\.settings-screen\{|\[data-component=composer\]|\[data-slot=session-queue-list\]/.test(arc.read(n).toString()));
    const patches = ['codex.css', 'codex-v2.css'].map(n => fs.readFileSync(path.join(__dirname, '../assets', n), 'utf8')).join('\n');
    const nativeStyles = arc.read(main).toString() + '\n' + patches + '\n' + dynamic.map(n => arc.read(n).toString()).join('\n');
    const base = 'html,body,#root{height:100%;margin:0}*{box-sizing:border-box}#root{display:flex}main{height:100%;min-width:0;display:flex;flex:1}.settings{height:100%}.settings-nav{display:flex}';
    const settings = `<div id="root"><main data-beauty-main><div class="settings-screen" data-testid="settings-screen"><div class="settings" data-component="tabs-v2" data-variant="settings" data-orientation="vertical">
      <div class="settings-mobile-nav">Settings</div><aside class="settings-sidebar"><div class="settings-nav">
        <div class="beauty-settings-head"><h1>设置</h1></div><button class="settings-back">返回</button>
        <div class="settings-search"><div data-component="text-input-v2"><div data-slot="text-input-v2-value"><input class="beauty-settings-search" placeholder="搜索设置"></div></div></div>
        <div class="settings-nav-groups" data-slot="tabs-v2-list"><button data-slot="tabs-v2-trigger" data-selected>外观</button></div>
      </div></aside><div class="settings-content"><section class="settings-panel"><div class="settings-tab-header"><div class="settings-tab-header-row"><h1 class="settings-tab-title">外观</h1></div></div>
        <section class="settings-v2-section" id="themeCard"><div class="beauty-theme-gallery"></div></section>
        <div class="settings-tab-body"><div data-component="settings-list"><div data-component="settings-row"><div data-slot="settings-row-copy">跟随系统</div><div data-slot="settings-row-control"><button>选择</button></div></div>
        <div data-component="settings-row" class="beauty-preset-row"><div data-slot="settings-row-copy">主题<div class="beauty-theme-gallery">${'<button class="beauty-theme-card"><span class="beauty-theme-default">默认</span></button>'.repeat(8)}</div></div></div></div></div>
      </section></div></div></div></main></div>`;
    const load = async (body, classes = '') => win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><html data-beauty-theme="dark"><head><style>${nativeStyles}</style><style>${base}</style></head><body data-beauty="codex-v2" class="${classes}">${body}</body></html>`));
    for (const width of [1440, 1000, 760, 390]) {
      win.setContentSize(width, 900);
      await load(settings, 'beauty-native-settings');
      const result = await win.webContents.executeJavaScript(`(() => {
        const screen=document.querySelector('.settings-screen'),sidebar=document.querySelector('.settings-sidebar'),search=document.querySelector('.settings-search'),panel=document.querySelector('.settings-panel'),gallery=document.querySelector('.beauty-theme-gallery');
        const s=screen.getBoundingClientRect(),b=sidebar.getBoundingClientRect(),p=panel.getBoundingClientRect(),g=gallery.getBoundingClientRect();
        const theme=document.getElementById('themeCard').getBoundingClientRect(),header=document.querySelector('.settings-tab-header').getBoundingClientRect(),fonts=document.querySelector('.settings-tab-body').getBoundingClientRect();
        return {screen:s.width,sidebar:b.width,sidebarMin:getComputedStyle(sidebar).minWidth,searchVisible:search.getBoundingClientRect().height>0&&getComputedStyle(search).display!=='none',overflow:screen.scrollWidth>s.width+1,panel:p.width,gallery:g.width,galleryOverflow:gallery.scrollWidth>g.width+1,alignment:[theme.left,header.left,fonts.left],widths:[theme.width,header.width,fonts.width]};
      })()`);
      assert(result.searchVisible, `${width}: native settings search stays visible`);
      assert(!result.overflow, `${width}: settings screen does not overflow: ${JSON.stringify(result)}`);
      assert(!result.galleryOverflow, `${width}: theme gallery stays inside its container`);
      assert(result.panel > 100, `${width}: settings panel retains usable width`);
      assert(Math.max(...result.alignment)-Math.min(...result.alignment)<1, `${width}: theme card, native title and fonts stay aligned`);
      assert(Math.max(...result.widths)-Math.min(...result.widths)<1, `${width}: settings sections keep the same width`);
      if (result.screen <= 799) {
        assert.equal(result.sidebarMin, '0px', `${width}: native mobile sidebar can shrink`);
        assert(Math.abs(result.sidebar - result.screen) < 1, `${width}: settings navigation spans the content`);
      }
    }
    win.setContentSize(1000, 800);
    await load(`<div id="root"><main data-beauty-main><div data-component="new-session" data-beauty-draft style="height:100%;width:100%"><div data-beauty-draft-content><div><div style="margin-top:32px"><div data-slot="new-session-composer" data-beauty-draft-controls><div id="composerWrapper"><form data-component="composer"><div data-component="composer-editor" contenteditable="true">Hello</div></form></div></div></div></div></div></div></main></div>`);
    const draft = await win.webContents.executeJavaScript(`(() => {const wrapper=document.getElementById('composerWrapper'),slot=wrapper.parentElement;return {width:wrapper.getBoundingClientRect().width,slot:slot.getBoundingClientRect().width,padding:getComputedStyle(wrapper).padding,margin:getComputedStyle(wrapper).margin,background:getComputedStyle(wrapper).backgroundColor};})()`);
    assert(Math.abs(draft.width-draft.slot)<1, 'A draft without a location bar keeps the full composer width');
    assert.equal(draft.padding, '0px', 'A single composer wrapper is not treated as the location tray');
    assert.equal(draft.margin, '0px');
    assert.equal(draft.background, 'rgba(0, 0, 0, 0)');
    console.log('OpenCode 2.2 CSS regressions passed: real dynamic styles, 4 viewport widths, native settings search, gallery and single-child composer');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
