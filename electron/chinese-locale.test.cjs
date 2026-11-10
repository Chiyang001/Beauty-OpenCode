const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {localizeChinese, localizePluginChinese, localeObjects, pluginObjects, pluginLocaleFiles, commandCatalogLocalization, translations} = require('./chinese-locale.cjs');
const {Archive} = require('./asar.cjs');
const patch = require('./patch.cjs');
const tokens = text => [...text.matchAll(/\{\{[^}]+\}\}/g)].map(m => m[0]).sort();

test('Chinese locale completion works with renamed module bindings and keeps exports intact', () => {
  const source = 'const futureLocale={"settings.appearance.description":"Appearance","common.ok":"OK"};export{futureLocale as default};';
  const result = localizeChinese(source), dict = localeObjects(result)[0].values;
  assert.equal(dict['common.ok'], '确定');
  assert.equal(dict['settings.timeline.row.width.title'], '时间轴宽度');
  assert.equal(dict['settings.timeline.row.width.comfortable'], '舒适');
  assert(result.endsWith('export{futureLocale as default};'));
});
test('Existing upstream Chinese and unrelated strings remain intact', () => {
  const source = 'const zh={"settings.appearance.description":"外观","common.ok":"好的","custom":"Leave this alone"};';
  const dict = localeObjects(localizeChinese(source))[0].values;
  assert.equal(dict['common.ok'], '好的'); assert.equal(dict.custom, 'Leave this alone');
  assert.equal(localizeChinese('export default {title:"Other"};'), 'export default {title:"Other"};');
});
test('Locale completion is idempotent and preserves escaped text and placeholders', () => {
  const result = localizeChinese('const zh={"ui.sessionReview.title":"审查"};');
  assert.equal(localizeChinese(result), result);
  assert.equal(localeObjects(result)[0].values['ui.sessionTurn.freeLimit.lineReset'], '今天的免费消息额度已用完，将于 {{time}} 重置。');
  const app = localeObjects(localizeChinese('const zh={"settings.appearance.description":"外观"};'))[0].values;
  assert(app['dialog.mcp.error.details'].includes('\n状态：失败\n'));
  assert(app['settings.plugins.parts.note'].includes('"-<id>"'));
});

const installed = patch.paths(patch.defaultFolder), arc = new Archive(fs.existsSync(installed.b) ? installed.b : installed.a);
const main = [...arc.index.keys()].find(n => /^out\/renderer\/assets\/main-.*\.js$/.test(n));
const english = Object.fromEntries(localeObjects(arc.read(main).toString()).map(locale => [locale.kind, locale.values]));
const chinese = [...arc.index.keys()].filter(n => /^out\/renderer\/assets\/zh-[^/]+\.js$/.test(n) && localeObjects(arc.read(n).toString()).length);
test('Both native Chinese dictionaries cover every current English fallback key', () => {
  assert.equal(chinese.length, 2);
  for (const name of chinese) {
    const before = localeObjects(arc.read(name).toString())[0];
    const after = localeObjects(localizeChinese(arc.read(name).toString()))[0];
    assert.deepEqual(Object.keys(english[before.kind]).filter(key => after.values[key] === undefined), [], name);
    for (const [key, value] of Object.entries(before.values))
      if (/\p{Script=Han}/u.test(value)) assert.equal(after.values[key], value, key);
  }
});
test('Every translated key exists upstream and keeps all interpolation placeholders', () => {
  for (const kind of ['ui', 'app']) for (const [key, value] of Object.entries(translations[kind])) {
    assert.equal(typeof english[kind][key], 'string', key);
    assert.deepEqual(tokens(value), tokens(english[kind][key]), key);
  }
});
test('Built-in plugin Chinese covers all supported descriptors without altering English', () => {
  const source = arc.read(main).toString(), plugins = pluginObjects(source);
  assert.equal(plugins.length, 13);
  for (const {english, translation} of plugins) {
    assert.deepEqual(Object.keys(translation.zh).sort(), Object.keys(english).sort());
    for (const [key, value] of Object.entries(translation.zh)) assert.deepEqual(tokens(value), tokens(english[key]), key);
  }
  const localized = localizePluginChinese(source);
  assert.deepEqual(pluginObjects(localized).map(p => p.english), plugins.map(p => p.english));
  assert.equal(localizePluginChinese(localized), localized);
  assert(localized.includes('演讲者备注')); assert(localized.includes('询问旁支问题'));
});
test('Archive migration includes Chinese chunks while English and other locale dictionaries stay intact', () => {
  const result = patch.build(arc);
  for (const name of chinese) assert(result.replacements[name], name);
  const migratedEnglish = Object.fromEntries(localeObjects(result.replacements[main].toString()).map(locale => [locale.kind, locale.values]));
  assert.deepEqual(migratedEnglish, english);
  for (const name of arc.index.keys())
    if (/^out\/renderer\/assets\/(?:zht|ja|fr|de|en)-[^/]+\.js$/.test(name)) assert.equal(result.replacements[name], undefined, name);
});
test('Lazy built-in plugin language chunks fill English fallbacks and retain existing Chinese', () => {
  const files = pluginLocaleFiles(arc.read(main).toString());
  assert.equal(files.size, 10);
  for (const [file, overrides] of files) {
    const source = arc.read('out/renderer/assets/' + file).toString();
    const result = localizeChinese(source, overrides), dict = localeObjects(result, overrides)[0].values;
    assert.deepEqual(Object.keys(overrides).filter(key => dict[key] === undefined), [], file);
    for (const [key, value] of Object.entries(localeObjects(source, overrides)[0].values))
      if (/\p{Script=Han}/u.test(value)) assert.equal(dict[key], value, key);
    assert.equal(localizeChinese(result, overrides), result);
  }
});

test('Persisted English command catalog labels are localized only when displaying Chinese', () => {
  const source = arc.read(main).toString();
  const result = commandCatalogLocalization(source, require('./native-v2.cjs').tree(source));
  assert.equal(result.changes.length, 1);
  const context = require('node:vm').createContext({});
  require('node:vm').runInContext(result.runtime, context);
  const localize = context.beautyChineseCatalogText;
  for (const label of ['Delete session', 'Rename session', 'Close browser tab', 'Focus browser address', 'Select an element in the browser page']) {
    assert(/\p{Script=Han}/u.test(localize(label, 'zh')), label);
    for (const locale of ['en', 'zht', 'ja']) assert.equal(localize(label, locale), label);
  }
  for (const label of ['My custom command', '删除会话', undefined, null]) assert.equal(localize(label, 'zh'), label);
  const entry = {title: 'Delete session', description: 'My custom command'};
  localize(entry.title, 'zh');
  assert.deepEqual(entry, {title: 'Delete session', description: 'My custom command'}, 'Persisted command metadata is not rewritten');
});
