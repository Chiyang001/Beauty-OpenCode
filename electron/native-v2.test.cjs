const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
const source = fs.readFileSync("assets/codex-native-bridge.js", "utf8");
test("Native project removal covers paginated sessions, sandboxes and descendants without removing unrelated sessions", async () => {
  const deleted = [],
    events = [];
  const pages = [
    {
      data: [
        { id: "parent", location: { directory: "C:/project" } },
        { id: "other", location: { directory: "C:/other" } },
      ],
      cursor: { next: "page2" },
    },
    {
      data: [
        {
          id: "child",
          parentID: "parent",
          location: { directory: "c:/PROJECT" },
        },
        {
          id: "archived",
          time: { archived: 1 },
          location: { directory: "C:/sandbox" },
        },
      ],
      cursor: { next: null },
    },
  ];
  const sandbox = {
    pathKey: (p) => p.toLowerCase(),
    notifySessionTabsRemoved: (e) => events.push(e),
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const ctx = {
    sdk: { api: { session: { list: async () => pages.shift() } } },
    data: { session: { remove: async (id) => deleted.push(id) } },
  };
  await sandbox.beautyNativeDeleteProject(
    ctx,
    { worktree: "C:/project", sandboxes: ["C:/sandbox"] },
    "local",
  );
  assert.equal(deleted.length, 3);
  assert(deleted.indexOf("child") < deleted.indexOf("parent"));
  assert(!deleted.includes("other"));
  assert(events.every((e) => e.server === "local"));
  assert.deepEqual(
    Array.from(
      sandbox.beautyNativeDescendants(
        [
          { id: "parent" },
          { id: "child", parentID: "parent" },
          { id: "grandchild", parentID: "child" },
          { id: "other" },
        ],
        "parent",
      ),
    ),
    ["parent", "child", "grandchild"],
  );
});
test("Failed native deletion preserves remaining state and stops notifications", async () => {
  const events = [],
    sandbox = {
      pathKey: (p) => p,
      notifySessionTabsRemoved: (e) => events.push(e),
    };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const ctx = {
    sdk: {
      api: {
        session: {
          list: async () => ({
            data: [{ id: "one", location: { directory: "project" } }],
            cursor: { next: null },
          }),
        },
      },
    },
    data: {
      session: {
        remove: async () => {
          throw Error("offline");
        },
      },
    },
  };
  await assert.rejects(
    sandbox.beautyNativeDeleteProject(ctx, { worktree: "project" }, "local"),
    /offline/,
  );
  assert.equal(events.length, 0);
});
const shellSource = fs.readFileSync('assets/codex-shell.js', 'utf8');
test('Session ordering ignores activity timestamps and breaks creation ties by id', () => {
  const sandbox = {}; vm.createContext(sandbox); vm.runInContext(shellSource,sandbox);
  const record=(id,created,updated)=>({session:{id,time:{created,updated}}});
  const result=sandbox.beautyMergeSessions([record('z',10,999),record('b',20,1)],[record('a',20,0)],new Set(),id=>id);
  assert.deepEqual(Array.from(result,r=>r.session.id),['a','b','z']);
  assert.deepEqual(Array.from(sandbox.beautyMergeSessions(result,[],new Set(['a']),id=>id),r=>r.session.id),['b','z']);
});
test('Sidebar summaries ignore usage updates but retain native navigation location',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(shellSource+'\n'+source,sandbox);
  const session={id:'s',title:'Chat',projectID:'p',location:{directory:'C:/repo',branch:'main'},time:{created:10,updated:20},cost:1,tokens:{input:20}};
  const before=JSON.stringify(sandbox.beautySessionSummaryNative(session));session.cost=99;session.tokens.input=300;session.time.updated=100;
  assert.equal(JSON.stringify(sandbox.beautySessionSummaryNative(session)),before);
  assert.equal(sandbox.beautySessionSummaryNative(session).location.directory,'C:/repo');
  session.title='Renamed';assert.notEqual(JSON.stringify(sandbox.beautySessionSummaryNative(session)),before);
  assert.equal(sandbox.beautySidebarWidth('invalid'),312);assert.equal(sandbox.beautySidebarWidth(100),240);assert.equal(sandbox.beautySidebarWidth(900),600);
});
test('Native status updates independently report running and unread',()=>{
  let effect;const classes=new Map(),attributes=new Map();const indicator={classList:{toggle:(k,v)=>classes.set(k,v)},setAttribute:(k,v)=>attributes.set(k,v)};
  let running=true,unread=true;const sandbox={nativeSessionStatus:()=>({loading:()=>running,unread:()=>unread}),ServerConnection:{key:()=> 'server'},beautyElement:()=>indicator,createEffect:fn=>{effect=fn;fn();}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);sandbox.beautyNativeSessionStatus({prepend(){}},{id:'s'},{});
  assert.equal(classes.get('beauty-running'),true);assert.equal(classes.get('beauty-unread'),false);
  running=false;effect();assert.equal(classes.get('beauty-unread'),true);assert.equal(attributes.get('aria-label'),'未读');
});

test('Pairing Chinese locale covers page, navigation and dialog strings without replacing English',()=>{
  const {localizePairing}=require('./native-v2.cjs');
  const original='const plugin={id:`pairing`,i18n:{en:{title:`Pairing`,expires:`Expires in {{time}}`}}};';
  const translated=localizePairing(original);
  const plugin=require('node:vm').runInNewContext(translated+'plugin');
  assert.equal(plugin.i18n.en.title,'Pairing');
  assert.equal(plugin.i18n.zh.title,'配对');
  assert.equal(plugin.i18n.zh['screenActive.title'],'保持屏幕唤醒');
  assert.equal(plugin.i18n.zh.expires,'将在 {{time}} 后失效');
  assert.equal(localizePairing(translated),translated);
  assert.equal(localizePairing('const plugin={id:`other`,i18n:{en:{title:`Other`}}};'),'const plugin={id:`other`,i18n:{en:{title:`Other`}}};');
});
