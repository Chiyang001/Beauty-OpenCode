const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const bridge = fs.readFileSync('assets/codex-native-bridge.js', 'utf8');

function removalContext(extra = {}) {
  const ctx = {ServerConnection: {key: conn => conn.key}, pathKey: value => value.toLowerCase().replaceAll('\\', '/'), ...extra};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('assets/codex-shell.js', 'utf8') + '\n' + bridge, ctx);
  ctx.beautyDeleteProjectSessions = (...args) => ctx.beautyNativeDeleteProject(...args);
  return ctx;
}

test('Project removal passes the project object through the real native hide implementation', async () => {
  const {Archive} = require('./asar.cjs'), patch = require('./patch.cjs'), {discover} = require('./native-v2.cjs');
  const installed = patch.paths(patch.defaultFolder), arc = new Archive(fs.existsSync(installed.b) ? installed.b : installed.a);
  const source = arc.read([...arc.index.keys()].find(name => /^out\/renderer\/assets\/main-.*\.js$/.test(name))).toString();
  if (source.includes('function NewLayout(props) {')) return;
  const d = discover(source), candidates = d.parsed.nodes.filter(({node}) => node.type === 'Property' && node.method && node.key.name === 'hide' && source.slice(node.start, node.end).includes('.worktree') && source.slice(node.start, node.end).includes('.flatMap('));
  assert.equal(candidates.length, 1);
  const method = candidates[0].node, nested = d.parsed.nodes.filter(({node}) => node.start > method.start && node.end < method.end);
  const sink = nested.find(({node}) => node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === 'hide').node.callee.object.name;
  const list = nested.find(({node}) => node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === 'flatMap').node.callee.object.callee.name;
  const project = {id: 'project', worktree: 'C:/repo', sandboxes: ['C:/sandbox']}, conn = {key: 'server'}, events = [], hidden = [];
  const ctx = removalContext({notifySessionTabsRemoved: () => events.push('notify')});
  const native = vm.runInNewContext('({' + source.slice(method.start, method.end) + '})', {
    [d.aliases.pathKey]: ctx.pathKey,
    [sink]: {hide: ids => hidden.push(...ids)},
    [list]: () => [project, {id: 'other', worktree: 'C:/other'}],
  });
  const tabs = {store: [
    {type: 'draft', server: 'server', directory: 'C:/repo'},
    {type: 'draft', server: 'server', directory: 'C:/sandbox'},
    {type: 'draft', server: 'server', directory: 'C:/other'},
    {type: 'draft', server: 'other-server', directory: 'C:/repo'},
  ], closeTab(index) { events.push('draft'); this.store.splice(index, 1); }};
  const data = {sdk: {api: {session: {list: async () => ({data: [{id: 's', location: {directory: 'C:/repo'}}]})}}}, data: {session: {remove: async () => events.push('delete')}}};
  await ctx.beautyRemoveProject(data, project, conn, tabs, {project: {hide(server, value) {
    assert.equal(server, conn); assert.equal(value, project);
    native.hide(value); events.push('hide');
  }}});
  assert.deepEqual(hidden, ['project']);
  assert.deepEqual(events, ['delete', 'notify', 'draft', 'draft', 'hide']);
  assert.equal(tabs.store.length, 2);
  assert.equal(tabs.store[0].directory, 'C:/other');
  assert.equal(tabs.store[1].server, 'other-server');
});

test('Legacy project removal still passes the directory to close', async () => {
  const ctx = removalContext(), conn = {key: 'server'}, project = {worktree: 'C:/repo'};
  let closed;
  ctx.beautyDeleteProjectSessions = async () => {};
  await ctx.beautyRemoveProject({}, project, conn, {store: []}, {project: {close: async (...args) => {closed = args;}}});
  assert.equal(closed[0], conn); assert.equal(closed[1], 'C:/repo');
});

test('Failed project session removal keeps drafts and the project visible', async () => {
  const ctx = removalContext(); let changed = false;
  ctx.beautyDeleteProjectSessions = async () => {throw Error('offline');};
  await assert.rejects(ctx.beautyRemoveProject({}, {worktree: 'C:/repo'}, {key: 'server'}, {store: [{type: 'draft', server: 'server', directory: 'C:/repo'}], closeTab() {changed = true;}}, {project: {hide() {changed = true;}}}), /offline/);
  assert.equal(changed, false);
});

test('Unknown project removal interfaces fail before deleting sessions', async () => {
  const ctx = removalContext(); let deleted = false;
  ctx.beautyDeleteProjectSessions = async () => {deleted = true;};
  await assert.rejects(ctx.beautyRemoveProject({}, {worktree: 'C:/repo'}, {key: 'server'}, {store: []}, {project: {}}), /项目移除接口/);
  assert.equal(deleted, false);
});

class Node {
  constructor(tag = 'div', cls = '') { this.tag = tag; this.className = cls; this.dataset = {}; this.children = []; this.classList = {add() {}, toggle() {}}; this.style = {setProperty() {}}; this.events = {}; }
  append(...children) { for (const child of children) { if (child.parentElement) child.parentElement.children.splice(child.parentElement.children.indexOf(child), 1); child.parentElement = this; this.children.push(child); } }
  prepend(child) { this.append(child); this.children.unshift(this.children.pop()); }
  contains(child) { for (; child; child = child.parentElement) if (child === this) return true; return false; }
  matches(selector) {
    if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1));
    const attr = /^\[data-(component|slot|testid)="([^"]+)"\]$/.exec(selector);
    return attr ? this.dataset[attr[1]] === attr[2] : this.tag === selector;
  }
  querySelector(selector) { for (const child of this.children) { if (child.matches(selector)) return child; const nested = child.querySelector(selector); if (nested) return nested; } return null; }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  setAttribute() {}
  removeAttribute() {}
  addEventListener(type, handler) { this.events[type] = handler; }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); }
}
const node = (tag, data, children = []) => { const n = new Node(tag); Object.assign(n.dataset, data); n.append(...children); return n; };
function load(extra = {}) {
  const ctx = {beautyElement: (tag, cls, text) => Object.assign(new Node(tag, cls), {textContent: text}), beautyWordmark: () => new Node(), untrack: fn => fn(), getFilename: path => path.split('/').at(-1), ...extra};
  vm.createContext(ctx); vm.runInContext(bridge, ctx); return ctx;
}

test('2.2 draft decoration follows the composer slot and preserves managed ancestors', () => {
  const composer = node('form', {component: 'composer'}), wrapper = node('div', {}, [composer]);
  const slot = node('div', {slot: 'new-session-composer'}, [wrapper, new Node()]);
  const controls = node('div', {}, [slot]), wordmark = node('div', {component: 'new-session-wordmark'});
  const content = node('div', {}, [wordmark, controls]), outer = node('div', {}, [content]);
  const draft = node('div', {component: 'new-session'}, [outer]), main = node('main', {}, [draft]);
  const ctx = load(), tabs = {store: [{type: 'draft', draftID: 'draft', directory: 'C:/repo'}]}, layout = {route: () => ({draftID: 'draft'})};
  ctx.beautyNativeDecorateDraft(main, tabs, layout);
  assert.equal(outer.dataset.beautyDraftContent, '');
  assert.equal(slot.dataset.beautyDraftControls, '');
  assert.equal(composer.parentElement, wrapper);
  assert.equal(wordmark.hidden, true);
  assert.equal(draft.querySelector('.beauty-welcome').querySelector('h1').textContent, '我们应该在 repo 中做些什么？');
  ctx.beautyNativeDecorateDraft(main, tabs, layout);
  assert.equal(draft.children.filter(child => child.className === 'beauty-welcome').length, 1);
});

test('Native settings search stays in its Solid-owned position and uses the native results index', () => {
  const input = new Node('input'), search = new Node('div', 'settings-search'); search.append(input);
  const nav = new Node('div', 'settings-nav'); nav.append(new Node('button'), search);
  const screen = node('div', {testid: 'settings-screen'}, [nav]), root = node('div', {}, [screen]);
  const ctx = load({document: {querySelector: selector => root.querySelector(selector), body: new Node('body')}});
  ctx.beautyNativeDecorateSettings(() => {});
  assert.equal(search.parentElement, nav);
  assert.equal(input.parentElement, search);
  assert(nav.querySelector('.beauty-settings-head'));
  assert.equal(input.type, 'search');
  ctx.beautyNativeDecorateSettings(() => {});
  assert.equal(nav.children.filter(child => child.className === 'beauty-settings-head').length, 1);
});

test('2.2 exports unopened sessions through the native export controller', async () => {
  let exported;
  const ctx = load();
  await ctx.beautyNativeExportSession({session: {server: () => 'server', export: async (...args) => {exported = args;}}}, {}, {}, {id: 'session'});
  assert.equal(exported[0], 'server');
  assert.equal(exported[1].id, 'session');
});

test('Virtual timeline reads all loaded user messages from the routed server and reveals through native anchors', () => {
  const selected = [], navigations = [], conn = {key: 'route-server'}, other = {key: 'focused-server'};
  const ctx = load({ServerConnection: {key: value => value.key}});
  const home = {server: {list: () => [other, conn], focused: () => other, context: value => {selected.push(value); return {data: {session: {message: {list: () => [{id: 'first', type: 'user', text: 'Hello'}, {id: 'assistant', type: 'assistant'}, {id: 'offscreen', type: 'user', text: 'Not mounted'}]}}}};}}};
  const source = ctx.beautyNativeTimelineSource(home, {route: () => ({sessionId: 'session', server: 'route-server'})}, (...args) => navigations.push(args), {pathname: '/session/session', search: '?server=route-server'});
  const snapshot = source.read();
  assert.equal(selected[0], conn);
  assert.deepEqual(Array.from(snapshot.messages, item => item.id), ['first', 'offscreen']);
  source.reveal('offscreen');
  assert.equal(navigations[0][0], '/session/session?server=route-server#message-offscreen');
  assert.equal(navigations[0][1].replace, true);
});

test('Native summary retains complete navigation location without tracking token updates', () => {
  const ctx = load({beautySessionSummary: value => value});
  const session = {id: 's', location: {directory: 'C:/repo', branch: 'main', workspace: 'branch-1'}, time: {created: 1}, tokens: {input: 10}};
  const first = ctx.beautySessionSummaryNative(session);
  session.tokens.input = 100;
  assert.equal(JSON.stringify(ctx.beautySessionSummaryNative(session)), JSON.stringify(first));
  assert.equal(first.location.workspace, 'branch-1');
});

test('Native branch tooltip reads the 2.2 location VCS store', () => {
  const attrs = {}, button = {prepend() {}, title: ''}, session = {id: 's', title: 'Chat', directory: 'C:/repo', location: {directory: 'C:/repo'}};
  const ctx = load({nativeSessionStatus: () => ({loading: () => false, unread: () => true}), ServerConnection: {key: () => 'server'}, createEffect: fn => fn(), beautyElement: () => ({classList: {toggle() {}}, setAttribute: (key, value) => {attrs[key] = value;}})});
  ctx.beautyNativeSessionStatus(button, session, {}, {data: {session: {get: () => session}, location: {vcs: {info: () => ({branch: {current: 'topic'}})}}}});
  assert.equal(button.title, 'Chat\nC:/repo\ntopic');
  assert.equal(attrs['aria-label'], '未读');
  ctx.beautyNativeSessionStatus(button, session, {}, {sync: {}, data: {session: {get: () => session}, location: {vcs: {info: () => undefined}}}});
  assert.equal(button.title, 'Chat\nC:/repo');
});

test('Virtual timeline renders offscreen message marks and delegates reveal without requiring DOM rows', () => {
  const body = new Node('body'), root = new Node(), viewport = new Node();
  viewport.scrollTop = 0; viewport.getBoundingClientRect = () => ({left: 100, top: 0, height: 600});
  const visible = new Node(); visible.dataset.messageId = 'visible'; visible.textContent = 'Visible';
  visible.getClientRects = () => [{}]; visible.getBoundingClientRect = () => ({top: 10});
  visible.closest = () => viewport;
  let serial = 0; const frames = new Map(), reveals = [];
  const sandbox = {
    document: {body, createElement: tag => new Node(tag), getElementById: () => root, querySelectorAll: () => [visible], querySelector: () => new Node(), addEventListener() {}, removeEventListener() {}},
    window: {addEventListener() {}, removeEventListener() {}},
    MutationObserver: class {observe() {} disconnect() {}},
    createEffect: fn => fn(), requestAnimationFrame: fn => {frames.set(++serial, fn); return serial;}, cancelAnimationFrame: id => frames.delete(id),
    setTimeout, clearTimeout,
  };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('assets/codex-shell.js', 'utf8'), sandbox);
  const dispose = sandbox.beautyTimelineMount({read: () => ({key: 'server:session', messages: [{id: 'offscreen', text: 'Earlier'}, {id: 'visible', text: 'Visible'}, {id: 'future', text: 'Later'}]}), reveal: id => reveals.push(id)});
  for (const [id, frame] of frames) {frames.delete(id); frame();}
  const rail = body.children[0];
  assert.equal(rail.children.length, 3);
  rail.children[0].events.click();
  assert.deepEqual(reveals, ['offscreen']);
  dispose();
  assert.equal(body.children.length, 0);
  assert.equal(frames.size, 0);
});
