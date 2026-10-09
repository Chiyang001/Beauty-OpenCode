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
