const acorn = require("acorn");
function tree(source) {
  const ast = acorn.parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
    }),
    nodes = [];
  function walk(n, parent) {
    if (!n || typeof n !== "object") return;
    if (n.type) nodes.push({ node: n, parent });
    for (const [k, v] of Object.entries(n)) {
      if (k === "start" || k === "end") continue;
      if (Array.isArray(v)) v.forEach((x) => walk(x, n));
      else if (v && typeof v === "object") walk(v, n);
    }
  }
  walk(ast);
  return { ast, nodes };
}
function discover(source) {
  const parsed = tree(source),
    compact = (n) =>
      source.slice(n?.start ?? 0, n?.end ?? 0).replace(/\s+/g, ""),
    functions = parsed.nodes.filter(
      ({ node }) => node.type === "FunctionDeclaration",
    );
  const one = (xs, label) => {
    if (xs.length !== 1) throw Error("新版挂载点无法唯一识别：" + label);
    return xs[0];
  };
  const fn = (keys, label) =>
    one(
      functions.filter(({ node }) =>
        keys.every((k) => compact(node).includes(k)),
      ),
      label,
    ).node;
  const named = (keys, label) => fn(keys, label).id.name;
  const context = (name, marker) => {
    const entry = one(
      parsed.nodes.filter(
        ({ node }) =>
          node.type === "VariableDeclarator" &&
          node.id.type === "ObjectPattern" &&
          node.init?.type === "CallExpression" &&
          (!marker || compact(node.init).includes(marker)) &&
          node.init.arguments[0]?.properties?.some(
            (p) =>
              p.key?.name === "name" &&
              (p.value.value ?? p.value.quasis?.[0]?.value.cooked) === name,
          ),
      ),
      name,
    ).node;
    return entry.id.properties.find((p) => p.key.name === "use").value.name;
  };
  const variable = (keys, label) =>
    one(
      parsed.nodes.filter(
        ({ node }) =>
          node.type === "VariableDeclarator" &&
          node.id.type === "Identifier" &&
          keys.every((k) => compact(node.init).includes(k)),
      ),
      label,
    ).node.id.name;
  const home = fn(["focusedContext:", "openProjectNewSession:"], "home");
  const projects = named(
    ["utility:", "canImportSession:", "openNewSession:"],
    "projects",
  );
  const sessions = named(
    ["searchRecords:", "showDelete:", "lookup:"],
    "sessions",
  );
  const layout = fn(
    ["tabsWidth:", "tabsMount:", "appearance.tabLayout()"],
    "shell",
  );
  const homepage = one(
    functions.filter(
      ({ node }) =>
        compact(node).includes("=" + home.id.name + "()") &&
        compact(node).includes("=" + projects + "(") &&
        compact(node).includes("=" + sessions + "("),
    ),
    "homepage",
  ).node;
  const signal = named(["observerSlots:null", "comparator:"], "signal");
  const cleanup = named(["cleanups.push", "cleanups===null"], "cleanup");
  const effect = named([".user=!0", "suspense="], "effect");
  const onmount = one(
    functions.filter(
      ({ node }) =>
        node.params.length === 1 &&
        node.body.body.length === 1 &&
        node.body.body[0].expression?.callee?.name === effect &&
        node.body.body[0].expression.arguments[0]?.type ===
          "ArrowFunctionExpression" &&
        node.body.body[0].expression.arguments[0].body.type ===
          "CallExpression",
    ),
    "mount",
  ).node;
  const untrack = onmount.body.body[0].expression.arguments[0].body.callee.name;
  const navigate = variable([".navigatorFactory()"], "navigate");
  const navNode = parsed.nodes.find(
    ({ node }) =>
      node.type === "VariableDeclarator" && node.id.name === navigate,
  ).node;
  const router = navNode.init.body.callee.object.callee.name;
  const location = variable([router + "().location"], "location");
  const server = one(
    [
      ...new Set(
        parsed.nodes
          .filter(
            ({ node }) =>
              node.type === "MemberExpression" &&
              node.property.name === "key" &&
              node.object.type === "Identifier" &&
              node.start > home.start &&
              node.end < home.end,
          )
          .map(({ node }) => node.object.name),
      ),
    ],
    "server-key",
  );
  const pathKey = one(
    [
      ...new Set(
        [...compact(home).matchAll(/([\w$]+)\(\w+\.worktree\)===/g)].map(
          (m) => m[1],
        ),
      ),
    ],
    "path",
  );
  const filename = one(
    functions.filter(
      ({ node }) =>
        compact(node).includes(".lastIndexOf(") &&
        compact(node).includes(".slice(") &&
        node.body.body[0].type === "IfStatement" &&
        parsed.nodes.filter(
          (x) =>
            x.node.start > node.start &&
            x.node.end < node.end &&
            x.node.type === "MemberExpression" &&
            x.node.property.name === "lastIndexOf",
        ).length === 2,
    ),
    "filename",
  ).node.id.name;
  return {
    parsed,
    home,
    layout,
    homepage,
    aliases: {
      ServerConnection: server,
      pathKey,
      getFilename: filename,
      createSignal: signal,
      createEffect: effect,
      onMount: onmount.id.name,
      onCleanup: cleanup,
      untrack,
      // 2.0.30 uses unread(id, session) where 2.0.26 used unseenCount(id).
      // Identify the controller by its shared notification and running-state APIs.
      nativeSessionStatus: named(["notification.session.", "session.pending.list", "unread:", "loading:"], "session status"),
      useTheme: context("Theme"),
      useTabs: context("Tabs"),
      useLayout: context("Layout"),
      useCommand: context("Command"),
      useNavigate: navigate,
      useLocation: location,
      useQueryClient: variable(["NoQueryClientset"], "query"),
      createHomeController: home.id.name,
      createHomeProjectsController: projects,
      createHomeSessionsController: sessions,
    },
  };
}
function edits(source, changes) {
  for (const [start, end, value] of changes.sort((a, b) => b[0] - a[0]))
    source = source.slice(0, start) + value + source.slice(end);
  return source;
}
function localizePairing(source) {
  const dictionaries = tree(source).nodes.filter(({ node }) =>
    node.type === 'ObjectExpression' &&
    node.properties.some(p => (p.key?.name ?? p.key?.value) === 'id' &&
      (p.value?.value ?? p.value?.quasis?.[0]?.value.cooked) === 'pairing') &&
    node.properties.some(p => (p.key?.name ?? p.key?.value) === 'i18n')
  ).map(({ node }) => node.properties.find(p => (p.key?.name ?? p.key?.value) === 'i18n').value);
  if (!dictionaries.length) return source; // Older versions do not have pairing.
  if (dictionaries.length !== 1 || dictionaries[0].type !== 'ObjectExpression')
    throw Error('配对语言包结构无法唯一识别');
  const dictionary = dictionaries[0];
  if (dictionary.properties.some(p => (p.key?.name ?? p.key?.value) === 'zh')) return source;
  const zh = {
    'command.title': '配对设备',
    title: '配对',
    description: '将其他设备连接到本机的 OpenCode 服务器。',
    'pair.title': '配对设备',
    'pair.description': '通过端到端加密隧道，随时随地连接手机、平板或其他电脑。',
    'pair.open': '配对设备',
    'pair.unavailable': '暂时无法使用配对功能。',
    'dialog.description': '使用另一台设备上的 OpenCode 应用扫描二维码，或复制链接。',
    'remote.title': '远程访问',
    'remote.description': '已配对的设备可通过互联网访问本机的 OpenCode 服务器。关闭后将断开连接，需要重新配对才能再次访问。',
    'remote.error': '无法更新远程访问设置，请重试。',
    'setup.title': '正在设置远程访问…',
    'setup.description': '这可能需要一分钟。',
    'setup.error': '无法设置远程访问。',
    retry: '重试',
    'screenActive.title': '保持屏幕唤醒',
    'screenActive.description': 'OpenCode 运行期间，防止本机屏幕进入休眠。',
    'screenActive.error': '无法更新屏幕唤醒设置，请重试。',
    qr: '配对二维码',
    copyLink: '复制链接',
    'copy.error': '无法复制配对信息，请重试。',
    error: '无法更新配对信息，请重试。',
    expires: '将在 {{time}} 后失效',
    refresh: '刷新配对码',
  };
  return edits(source, [[dictionary.end - 1, dictionary.end - 1, ',zh:' + JSON.stringify(zh)]]);
}
function migrate(arc, pkg, html, script, style, source, asset, presets) {
  if (
    !source.includes("data-slot=vertical-tabs-sidebar") ||
    !source.includes("data-slot=titlebar-v2")
  )
    throw Error("新版界面结构不匹配");
  const d = discover(source),
    a = d.aliases;
  const functions = d.parsed.nodes.filter(
    (x) => x.node.type === "FunctionDeclaration",
  );
  const find = (needle) => {
    const found = functions.filter((x) =>
      source
        .slice(x.node.start, x.node.end)
        .replace(/\s+/g, "")
        .includes(needle),
    );
    if (found.length !== 1) throw Error("无法识别新版接口：" + needle);
    return found[0].node.id.name;
  };
  const event = d.parsed.nodes.find(
    (x) =>
      x.node.type === "VariableDeclarator" &&
      (x.node.init?.value ?? x.node.init?.quasis?.[0]?.value.cooked) ===
        "opencode:session-tabs-removed",
  )?.node.id.name;
  if (!event) throw Error("无法识别会话删除事件");
  const notifications=d.parsed.nodes.filter(({node})=>node.type==='NewExpression'&&node.callee.name==='CustomEvent'&&node.arguments[0]?.name===event);
  const notify=functions.find(x=>notifications.some(({node})=>node.start>x.node.start&&node.end<x.node.end))?.node.id.name;
  const read = find("sessionIDs.filter");
  if (!notify) throw Error("无法识别会话删除通知");
  const desktop = d.parsed.nodes.find(
    ({ node }) =>
      node.type === "VariableDeclarator" &&
      node.init?.type === "ObjectExpression" &&
      node.init.properties.some((p) => p.key?.name === "getWindowBootstrap"),
  )?.node.id.name;
  if (!desktop) throw Error("缺少桌面窗口接口");
  const bindings = {
    ...a,
    beautyDesktopApi: desktop,
    NativeHome: a.createHomeController,
    NativeHomeSessions: a.createHomeSessionsController,
    SESSION_TABS_REMOVED_EVENT: event,
    notifySessionTabsRemoved: notify,
    readSessionTabsRemovedDetail: read,
  };
  delete bindings.createHomeSessionsController;
  delete bindings.createHomeController;
  let shell = asset("codex-shell.js")
    .toString()
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replaceAll("window.api", "beautyDesktopApi");
  shell = shell.replace(
    "const home=createHomeController(); const projects=createHomeProjectsController(home);",
    "const home=createHomeController(); const projects=createHomeProjectsController(home);",
  );
  shell = shell.replace(
    "const refreshNames=()=>queryClient.invalidateQueries({queryKey:home.server.focusedSync().homeSessions.indexKey});",
    'const refreshNames=()=>queryClient.invalidateQueries({queryKey:["home-sessions",home.server.focused()],exact:true});',
  );
  shell = shell.replace(
    "for(const id of ids)home.server.focusedSync().homeSessions.remove(id);",
    "",
  );
  const liveStart = shell.indexOf(
    "    if(ctx)for(const project of projectList)",
  );
  const liveEnd = shell.indexOf("    const records=", liveStart);
  shell =
    shell.slice(0, liveStart) +
    "    if(ctx)for(const session of ctx.data.session.list())if(!session.parentID&&!session.time?.archived)live.push({session:beautySessionSummaryNative(session),projectName:ctx.projects.forSession(session)?.name||getFilename(session.location.directory)});\n" +
    shell.slice(liveEnd);
  const deleteStart = shell.indexOf(
    "          const [store,setStore]=ctx.sync.child(s.directory);",
  );
  const deleteEnd = shell.indexOf(
    "          notifySessionTabsRemoved(",
    deleteStart,
  );
  shell =
    shell.slice(0, deleteStart) +
    "          const ids=new Set(beautyNativeDescendants(ctx.data.session.list(),s.id));\n          await ctx.data.session.remove(s.id);\n" +
    shell.slice(deleteEnd);
  const projectStart = shell.indexOf(
    "async function beautyDeleteProjectSessions(",
  );
  const projectEnd = shell.indexOf(
    "function beautyConfirmDelete(",
    projectStart,
  );
  shell =
    shell.slice(0, projectStart) +
    "async function beautyDeleteProjectSessions(ctx,project,server){return beautyNativeDeleteProject(ctx,project,server); }\n" +
    shell.slice(projectEnd);
  shell = shell
    .replace(
      "const key=e=>{if(e.key==='Escape')setMenu(null);};",
      "const key=e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='b'){e.preventDefault();e.stopImmediatePropagation();setCollapsed(!collapsed());return;}if(e.key==='Escape')setMenu(null);};",
    )
    .replaceAll(
      "document.addEventListener('keydown',key);",
      "document.addEventListener('keydown',key,true);",
    )
    .replaceAll(
      "document.removeEventListener('keydown',key);",
      "document.removeEventListener('keydown',key,true);",
    );
  shell = shell.replaceAll("prompt-submit", "composer-submit");
  shell = shell.replace("    add('永久删除','trash',()=>remove.click());", "    add('导出…','history',()=>beautyNativeExportSession(sessions,layout,command,session));\n    add('永久删除','trash',()=>remove.click());");
  shell = shell
    .replaceAll(
      '[data-component="prompt-input"]',
      '[data-component="composer-editor"]',
    )
    .replaceAll(
      '[data-component="session-prompt-dock"]',
      '[data-component="session-composer-dock"]',
    );
  const draftStart = shell.indexOf("    const draftRoot=");
  const draftEnd = shell.indexOf("  };\n  let scheduled", draftStart);
  shell =
    shell.slice(0, draftStart) +
    "    beautyNativeDecorateDraft(main,tabs,layout);\n" +
    shell.slice(draftEnd);
  shell = shell.replace(
    "    const main=document.querySelector",
    "    beautyNativeDecorateSettings(navigate);\n    const main=document.querySelector",
  );
  shell = shell.replace(
    "main.dataset.beautyMain='';",
    "main.dataset.beautyMain='';main.closest('[data-beauty-native-shell]')?.classList.toggle('beauty-settings-open',location.pathname==='/settings');",
  );
  // Tag the native shell frame once it exists; preserve all original window controls.
  shell = shell.replace(
    "const frame=main.firstElementChild;",
    "const nativeFrame=main.parentElement.parentElement;if(nativeFrame.dataset.beautyNativeShell!=='')nativeFrame.dataset.beautyNativeShell='';const frame=main.firstElementChild;",
  );
  let settings = asset("codex-settings.js")
    .toString()
    .replace(/^\uFEFF/, "");
  const selectStart = settings.indexOf(
    "  insert(row,createComponent(SelectV2,",
  );
  const selectEnd = settings.indexOf("  const presetRow=", selectStart);
  settings =
    settings.slice(0, selectStart) +
    `  row.append(beautyNativeSchemeSelect(props.controller.scheme,labels));\n` +
    settings.slice(selectEnd);
  const bridge = asset("codex-native-bridge.js")
    .toString()
    .replace(/^\uFEFF/, "");
  shell = shell.replace('row.append(button);beautySessionStatus(button,s,ctx);', 'row.append(button);beautyNativeSessionStatus(button,s,conn,ctx);');
  const aliases = Object.entries(bindings)
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  const renameStart=shell.indexOf('      await ctx.sdk.api.session.update({sessionID:session.id,');
  const renameEnd=shell.indexOf("      document.dispatchEvent(new CustomEvent('beauty:session-renamed'",renameStart);
  if(renameStart<0||renameEnd<0)throw Error('无法定位会话菜单重命名逻辑');
  shell=shell.slice(0,renameStart)+"      if(!await sessions.session.rename(ServerConnection.key(home.server.focused()),session,value))throw Error('重命名失败');\n"+shell.slice(renameEnd);
  const runtime = `\nfunction beautyNativeRuntime(action,payload){const ${aliases};const createHomeController=beautyNativeHome,createHomeSessionsController=beautyNativeSessions;const on=(read,run)=>()=>{const value=read();return untrack(()=>run(value));};\n${asset("theme-presets.js").toString().replaceAll("window.api", "beautyDesktopApi")}\n${shell}\n${settings}\n${bridge}\nif(action==='shell'){window.beautyAppearanceSection=props=>beautyNativeRuntime('appearance',props);window.beautyReasoningSlider=control=>beautyNativeRuntime('reasoning',control);return createBeautyShell();}if(action==='home')return BeautyHome();if(action==='appearance'){beautyPresetInit().apply(useTheme().mode());void beautyWallpaperInit().mount();return beautyAppearanceSection(payload);}if(action==='reasoning')return beautyReasoningSlider(payload); }\n`;
  const changes = [
    [
      d.layout.body.start + 1,
      d.layout.body.start + 1,
      "beautyNativeRuntime('shell');",
    ],
    [
      d.homepage.body.start + 1,
      d.homepage.body.start + 1,
      `if(!${a.useLocation}().search.includes('beautyOverview=1'))return beautyNativeRuntime('home');`,
    ],
  ];
  // Hide the native sidebar branch rather than modifying the user's preferences.
  const match = [
    ...source.matchAll(
      /([A-Za-z_$][\w$]*)\.appearance\.tabLayout\(\)===(["'`])vertical\2/g,
    ),
  ];
  if (match.length !== 1) throw Error("垂直侧栏结构不匹配");
  changes.push([match[0].index, match[0].index + match[0][0].length, "false"]);
  const replacements = {
    [script]: Buffer.from(localizePairing(edits(source, changes)) + runtime),
    [style]: Buffer.concat([
      arc.read(style),
      Buffer.from("\n/* Beauty OpenCode native v2 full migration */\n"),
      asset("codex.css"),
      asset("codex-v2.css"),
    ]),
    "out/renderer/index.html": Buffer.from(
      html.replace(
        "</head>",
        '<meta name="beauty-codex" content="native-v2">\n</head>',
      ),
    ),
    ...presets,
  };
  let appearanceFound = false,
    reasoningFound = false;
  for (const name of arc.index.keys()) {
    if (!/^out\/renderer\/assets\/.*\.js$/.test(name) || name === script)
      continue;
    let chunk = arc.read(name).toString();
    if (
      chunk.includes("settings.appearance.description") &&
      chunk.includes("settings-color-scheme")
    ) {
      const t = tree(chunk),
        candidates = t.nodes.filter(
          ({ node }) =>
            node.type === "ArrowFunctionExpression" &&
            node.body.type === "BlockStatement" &&
            chunk
              .slice(node.start, node.end)
              .includes("settings.appearance.description") &&
            node.body.body.some(
              (n) =>
                n.type === "ReturnStatement" &&
                n.argument?.type === "ArrayExpression",
            ),
        );
      if (candidates.length !== 1) throw Error("外观模块结构不匹配");
      const fn = candidates[0].node,
        ret = fn.body.body.find((n) => n.type === "ReturnStatement");
      const controller = /([\w$]+)\.scheme\.current\(\)/.exec(
        chunk.slice(fn.start, fn.end),
      )?.[1];
      if (!controller) throw Error("外观控制器不匹配");
      chunk = edits(chunk, [
        [
          ret.argument.start + 1,
          ret.argument.start + 1,
          `window.beautyAppearanceSection({controller:${controller}}),`,
        ],
      ]);
      appearanceFound = true;
    }
    if (
      chunk.includes("ui.promptInput.chooseVariant") &&
      !chunk.includes('"ui.promptInput.chooseVariant":')
    ) {
      const t = tree(chunk),
        calls = t.nodes.filter(
          ({ node }) =>
            node.type === "CallExpression" &&
            node.arguments[1]?.type === "ObjectExpression" &&
            node.arguments[1].properties.some(
              (p) => p.key.name === "control",
            ) &&
            chunk
              .slice(node.start, node.end)
              .includes("ui.promptInput.chooseVariant"),
        );
      if (calls.length !== 1) throw Error("思考强度控制器结构不匹配");
      const call = calls[0].node,
        control = call.arguments[1].properties.find(
          (p) => p.key.name === "control",
        ).value;
      chunk = edits(chunk, [
        [
          call.start,
          call.end,
          `window.beautyReasoningSlider(${chunk.slice(control.start, control.end)})`,
        ],
      ]);
      reasoningFound = true;
    }
    if (chunk !== arc.read(name).toString())
      replacements[name] = Buffer.from(chunk);
  }
  if (!appearanceFound || !reasoningFound)
    throw Error("缺少新版外观或思考强度模块");
  for (const [name, data] of Object.entries(replacements))
    if (name.endsWith(".js"))
      acorn.parse(data.toString(), {
        ecmaVersion: "latest",
        sourceType: "module",
      });
  return { pkg, adapter: "native-v2", replacements, bindings };
}
module.exports = { tree, discover, migrate, localizePairing };
