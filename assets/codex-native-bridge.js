/* Native 2.x bridge. UI primitives are shared with the 1.x shell. */
function beautyNativeModelName(button) {
  return button?.querySelector('.truncate')?.textContent?.trim() || '选择模型';
}
function beautyNativeReasoningSlider(control) {
  const [name, setName] = createSignal('选择模型');
  let source, sourceWrapper, observer;
  const trigger = beautyReasoningSlider(control, {
    name,
    open() {
      const button = trigger.closest('[data-component="composer"]')?.querySelector('[data-action="composer-model"]');
      button?.click();
    },
  });
  const restore = () => {
    sourceWrapper?.removeAttribute('data-beauty-model-source');
    source = sourceWrapper = undefined;
  };
  const refresh = () => {
    const button = trigger.closest('[data-component="composer"]')?.querySelector('[data-action="composer-model"]');
    if (source !== button) {
      restore();
      source = button;
      sourceWrapper = button?.closest('[data-component="tooltip-v2-trigger"]') || button;
      if (sourceWrapper) sourceWrapper.dataset.beautyModelSource = '';
    }
    setName(beautyNativeModelName(button));
  };
  onMount(() => {
    refresh();
    const form = trigger.closest('[data-component="composer"]');
    if (!form) return;
    observer = new MutationObserver(refresh);
    observer.observe(form, {childList: true, subtree: true, characterData: true});
  });
  onCleanup(() => { observer?.disconnect(); restore(); });
  return trigger;
}
function beautyNativeComposerMount() {
  let anchor, activeDialog, frame;
  const position = () => {
    frame = undefined;
    for (const button of document.querySelectorAll('[data-action="composer-model"]'))
      if (button.dataset.beautyModelButton !== '') button.dataset.beautyModelButton = '';
    if (activeDialog && !activeDialog.isConnected) { activeDialog = anchor = undefined; }
    if (!anchor?.isConnected) return;
    const dialog = document.querySelector('.model-dialog[role="dialog"],[role="dialog"]:has([data-section="free-models"])');
    if (!dialog) return;
    activeDialog = dialog;
    const root = dialog.closest('[data-component="dialog-v2"]');
    if (!root) return;
    if (root.dataset.beautyModelPopover !== '') root.dataset.beautyModelPopover = '';
    const box = anchor.getBoundingClientRect(), width = Math.min(360, innerWidth - 16);
    const above = box.top - 16, below = innerHeight - box.bottom - 16;
    const up = above >= 160 || above >= below;
    const height = Math.max(80, Math.min(440, up ? above : below));
    const left = Math.max(8, Math.min(box.right - width, innerWidth - width - 8));
    const top = up ? Math.max(8, box.top - height - 8) : box.bottom + 8;
    for (const [key, value] of Object.entries({left, top, width, height})) {
      const prop = '--beauty-model-' + key, next = value + 'px';
      if (root.style.getPropertyValue(prop) !== next) root.style.setProperty(prop, next);
    }
    // Native dialog dimensions include important rules inside CSS layers.
    // Inline important sizes keep both searchable and first-run pickers anchored.
    const container = dialog.closest('[data-slot="dialog-container"]');
    for (const [key, value] of Object.entries({width: width + 'px', height: height + 'px', 'min-width': '0px', 'min-height': '0px'}))
      if (container?.style.getPropertyValue(key) !== value) container?.style.setProperty(key, value, 'important');
    for (const [key, value] of Object.entries({width: '100%', height: '100%', 'min-width': '0px', 'min-height': '0px', 'max-width': '100%', 'max-height': '100%'}))
      if (dialog.style.getPropertyValue(key) !== value) dialog.style.setProperty(key, value, 'important');
    if (!dialog.classList.contains('model-dialog')) {
      const body = dialog.querySelector('[data-slot="dialog-body"]');
      for (const [key, value] of Object.entries({flex: '1 1 0%', 'min-height': '0px', 'max-height': 'none', 'overflow-y': 'auto'}))
        if (body?.style.getPropertyValue(key) !== value) body?.style.setProperty(key, value, 'important');
    }
  };
  const schedule = () => { if (frame === undefined) frame = requestAnimationFrame(position); };
  const click = event => {
    const button = event.target.closest?.('[data-action="composer-model"]');
    if (!button) return;
    anchor = button.closest('[data-component="composer"]')?.querySelector('.beauty-composer-trigger') || button;
    activeDialog = undefined;
    schedule();
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {childList: true, subtree: true});
  document.addEventListener('click', click, true);
  window.addEventListener('resize', schedule);
  document.addEventListener('scroll', schedule, true);
  schedule();
  return () => {
    observer.disconnect();
    document.removeEventListener('click', click, true);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('scroll', schedule, true);
    if (frame !== undefined) cancelAnimationFrame(frame);
  };
}
async function beautyNativeExportSession(sessions, layout, command, session) {
  // 2.2 exposes export on the home controller; it also handles unopened sessions.
  if (typeof sessions.session.export === 'function')
    return sessions.session.export(sessions.session.server?.(), session);
  const current = () => { const route = layout.route(); return route.sessionId || route.id; };
  if (current() !== session.id) sessions.session.open(session);
  for (let attempt = 0; attempt < 180; attempt++) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const action = command.options.find(item => item.id === 'session.export' && !item.disabled);
    if (current() === session.id && action) {
      command.trigger('session.export', 'beauty-sidebar');
      return;
    }
  }
}
function beautyNativeSessions(home) {
  const native = NativeHomeSessions(home);
  const normalize = (record) => ({
    ...record,
    session: {
      ...record.session,
      directory: record.session.location.directory,
    },
  });
  return {
    ...native,
    session: {
      ...native.session,
      server: () => {
        const conn = home.server.focused();
        return conn ? ServerConnection.key(conn) : native.session.server?.();
      },
    },
    data: {
      ...native.data,
      searchRecords: () => native.data.searchRecords().map(normalize),
    },
  };
}
async function beautyNativeDeleteProject(ctx, project, server) {
  const directories = new Set(
    [project.worktree, ...(project.sandboxes || [])].map(pathKey),
  );
  let cursor,
    all = [];
  do {
    const page = await ctx.sdk.api.session.list({
      limit: 5000,
      order: "desc",
      ...(cursor ? { cursor } : {}),
    });
    all.push(...page.data);
    cursor = page.cursor?.next;
  } while (cursor);
  const remaining = new Map(
    all
      .filter((s) => directories.has(pathKey(s.location.directory)))
      .map((s) => [s.id, s]),
  );
  while (remaining.size) {
    const parents = new Set(
      [...remaining.values()].map((s) => s.parentID).filter(Boolean),
    );
    const session = [...remaining.values()].find((s) => !parents.has(s.id));
    if (!session) throw Error("会话层级异常，无法删除项目");
    await ctx.data.session.remove(session.id);
    remaining.delete(session.id);
    notifySessionTabsRemoved({
      server,
      directory: session.location.directory,
      sessionIDs: [session.id],
    });
  }
}
function beautyNativeDecorateSettings(navigate) {
  const screen = document.querySelector('[data-testid="settings-screen"]');
  document.body.classList.toggle("beauty-native-settings", !!screen);
  if (!screen) return;
  if (screen.dataset.beautySettings !== "") screen.dataset.beautySettings = "";
  const nav = screen.querySelector(".settings-nav");
  if (!nav || nav.querySelector(".beauty-settings-head")) return;
  const header = beautyElement("div", "beauty-settings-head");
  header.append(beautyElement("h1", "", "设置"));
  const nativeSearch = nav.querySelector(".settings-search");
  const search = nativeSearch?.querySelector("input") || beautyElement("input", "beauty-settings-search");
  search.classList.add("beauty-settings-search");
  search.type = "search";
  search.placeholder = "搜索设置";
  search.setAttribute("aria-label", "搜索设置");
  // Keep native search in its Solid-owned location: 2.2 searches all settings
  // through an indexed results view, including pages that are not mounted yet.
  if (!nativeSearch) header.append(search);
  nav.prepend(header);
  if (nativeSearch) return;
  const filter = () => {
    const q = search.value.trim().toLowerCase();
    for (const row of screen.querySelectorAll(
      '[data-component="settings-row"],[data-component="settings-v2-row"]',
    ))
      row.classList.toggle(
        "beauty-settings-filtered",
        !!q && !row.textContent.toLowerCase().includes(q),
      );
    for (const button of screen.querySelectorAll(".settings-nav button"))
      button.classList.toggle(
        "beauty-search-match",
        !!q && button.textContent.toLowerCase().includes(q),
      );
  };
  search.addEventListener("input", filter);
  const observer = new MutationObserver(filter);
  observer.observe(screen, { childList: true, subtree: true });
  const removal = new MutationObserver(() => {
    if (!nav.isConnected) {
      observer.disconnect();
      removal.disconnect();
    }
  });
  removal.observe(document.getElementById("root"), {
    childList: true,
    subtree: true,
  });
}
function beautyNativeDecorateDraft(main, tabs, layout) {
  const draft = main.querySelector('[data-component="new-session"]');
  if (!draft) return;
  const wordmark = draft.querySelector(
    '[data-component="new-session-wordmark"]',
  );
  const form = draft.querySelector('[data-component="composer"]');
  if (!wordmark || !form) return;
  if (draft.dataset.beautyDraft !== "") draft.dataset.beautyDraft = "";
  wordmark.hidden = true;
  const slot = form.closest('[data-slot="new-session-composer"]');
  let content = wordmark.parentElement;
  while (content && content !== draft && !content.contains(form))
    content = content.parentElement;
  if (!content || content === draft) return;
  const outer = content.parentElement;
  let controls = slot;
  if (!controls) {
    controls = form;
    while (controls.parentElement && controls.parentElement !== content)
      controls = controls.parentElement;
  }
  if (!outer || outer === draft || !draft.contains(outer)) return;
  if (outer.dataset.beautyDraftContent !== "") outer.dataset.beautyDraftContent = "";
  if (controls.dataset.beautyDraftControls !== "") controls.dataset.beautyDraftControls = "";
  let hero = draft.querySelector(".beauty-welcome");
  if (!hero) {
    hero = beautyElement("div", "beauty-welcome");
    hero.append(beautyWordmark(), beautyElement("h1"));
    draft.append(hero);
  }
  const route = untrack(() => layout.route()),
    tab = untrack(() =>
      tabs.store.find((t) => t.type === "draft" && t.draftID === route.draftID),
    );
  const heading = hero.querySelector("h1"),
    text = tab?.directory
      ? "我们应该在 " + getFilename(tab.directory) + " 中做些什么？"
      : "我们开始做点什么？";
  if (heading.textContent !== text) heading.textContent = text;
}
function beautyNativeDescendants(sessions, id) {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of sessions)
      if (ids.has(item.parentID) && !ids.has(item.id)) {
        ids.add(item.id);
        changed = true;
      }
  }
  return [...ids];
}
function beautyNativeHome() {
  const home = NativeHome(),
    tabs = useTabs();
  const open = (server, directory) => {
    const beautyExisting = tabs.store.find(
      (tab) =>
        tab.type === "draft" &&
        tab.server === ServerConnection.key(server) &&
        pathKey(tab.directory ?? "") === pathKey(directory ?? ""),
    );
    if (beautyExisting) return tabs.select(beautyExisting);
    return home.project.openProjectNewSession(server, directory);
  };
  return {
    ...home,
    project: {
      ...home.project,
      openProjectNewSession: open,
      openNewSession: () => {
        const server = home.server.focused(),
          project = home.project.newSession();
        if (server && project) return open(server, project.worktree);
      },
    },
  };
}
function beautyNativeTimelineSource(home, layout, navigate, location) {
  return {
    read() {
      const route = layout.route(), id = route.sessionId || route.id;
      if (!id) return {key: '', messages: []};
      const conn = home.server.list().find(item => ServerConnection.key(item) === route.server) || home.server.focused();
      const ctx = conn && home.server.context(conn);
      const messages = ctx?.data?.session?.message?.list(id) || [];
      return {
        key: (conn ? ServerConnection.key(conn) : '') + ':' + id,
        messages: messages.filter(message => message.type === 'user').map(message => ({id: message.id, text: message.text || ''})),
      };
    },
    reveal(id) {
      // The native hash handler reveals virtual rows and loads older pages.
      navigate(location.pathname + location.search + '#message-' + encodeURIComponent(id), {replace: true});
    },
  };
}
function beautyNativeSchemeSelect(controller, labels) {
  const trigger = beautyButton('', '', () => toggle(), 'beauty-select-trigger');
  trigger.dataset.action = 'beauty-color-scheme';
  trigger.setAttribute('aria-label', '界面主题');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.insertAdjacentHTML('beforeend', '<span class="beauty-select-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>');
  const values = ['system', 'light', 'dark'];
  let popup;
  const close = () => {
    popup?.remove(); popup = undefined;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', keys, true);
    window.removeEventListener('resize', close);
  };
  const outside = event => { if (!popup?.contains(event.target) && !trigger.contains(event.target)) close(); };
  const keys = event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); trigger.focus(); }
    else if (['ArrowDown','ArrowUp','Home','End'].includes(event.key) && popup) {
      event.preventDefault(); const items = [...popup.querySelectorAll('[role="option"]')];
      const index = items.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length-1 : (index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
      items[next].focus();
    }
  };
  const toggle = () => {
    if (popup) { close(); return; }
    popup = beautyElement('div', 'beauty-select-menu');
    popup.setAttribute('role', 'listbox'); popup.setAttribute('aria-label', '界面主题');
    for (const value of values) {
      const option = beautyButton(labels[value], '', () => { controller.select(value); close(); trigger.focus(); }, 'beauty-select-option');
      option.setAttribute('role', 'option'); option.dataset.value = value;
      option.setAttribute('aria-selected', String(controller.current() === value)); popup.append(option);
    }
    document.body.append(popup); const box = trigger.getBoundingClientRect();
    popup.style.minWidth = Math.max(156,box.width)+'px';
    popup.style.left = Math.max(8,Math.min(box.right-popup.offsetWidth,innerWidth-popup.offsetWidth-8))+'px';
    popup.style.top = (box.bottom+popup.offsetHeight+8<innerHeight ? box.bottom+6 : Math.max(8,box.top-popup.offsetHeight-6))+'px';
    trigger.setAttribute('aria-expanded','true');
    popup.querySelector('[aria-selected="true"]')?.focus();
    document.addEventListener('pointerdown',outside,true); document.addEventListener('keydown',keys,true); window.addEventListener('resize',close);
  };
  createEffect(() => { const value=controller.current();trigger.dataset.value=value;trigger.firstElementChild.textContent=labels[value];for(const option of popup?.children||[])option.setAttribute('aria-selected',String(option.dataset.value===value)); });
  onCleanup(close); return trigger;
}

function beautySessionSummaryNative(s){return beautySessionSummary({id:s.id,title:s.title,projectID:s.projectID,location:{...s.location},parentID:s.parentID,directory:s.location.directory,branch:s.location.branch,time:{created:s.time.created,archived:s.time.archived}});}
function beautyNativeSessionStatus(button,session,conn,ctx){
  if(!conn)return;
  const status=nativeSessionStatus(()=>ServerConnection.key(conn),()=>session.id,()=>true,()=>ctx?.data.session.get(session.id)??session);
  const indicator=beautyElement('span','beauty-session-status');button.prepend(indicator);
  createEffect(()=>{const running=status.loading(),unread=status.unread();indicator.classList.toggle('beauty-running',running);indicator.classList.toggle('beauty-unread',!running&&unread);indicator.setAttribute('aria-label',running?'运行中':unread?'未读':'');const branch=ctx?.data?.location?.vcs?.info(session.location)?.branch?.current||ctx?.sync?.child?.(session.directory)?.[0]?.vcs?.branch||session.branch;button.title=[session.title||'新聊天',session.directory,branch].filter(Boolean).join('\n');});
}
