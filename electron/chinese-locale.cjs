const acorn = require('acorn');
const translations = require('../assets/chinese-locale.json');

const keyOf = property => property.key?.name ?? property.key?.value;
const valueOf = node => node?.type === 'Literal' ? node.value
  : node?.type === 'TemplateLiteral' && !node.expressions.length ? node.quasis[0].value.cooked : undefined;

function localeObjects(source, extraOverrides) {
  const found = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ObjectExpression') {
      const properties = node.properties.filter(p => p.type === 'Property');
      const keys = new Set(properties.map(keyOf));
      const kind = keys.has('ui.sessionReview.title') ? 'ui' : keys.has('settings.appearance.description') ? 'app'
        : extraOverrides && properties.some(p => Object.hasOwn(extraOverrides, keyOf(p))) ? 'plugin' : undefined;
      if (kind) found.push({kind, node, properties, values: Object.fromEntries(properties.map(p => [keyOf(p), valueOf(p.value)]))});
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === 'start' || key === 'end') continue;
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  }
  visit(acorn.parse(source, {ecmaVersion: 'latest', sourceType: 'module'}));
  return found;
}

function localizeChinese(source, extraOverrides) {
  const locales = localeObjects(source, extraOverrides), changes = [], seen = new Set();
  for (const {kind, node, properties} of locales) {
    if (seen.has(kind)) throw Error('中文语言包无法唯一识别：' + kind);
    seen.add(kind);
    const pending = {...(kind === 'plugin' ? extraOverrides : translations[kind])};
    for (const property of properties) {
      const key = keyOf(property), next = pending[key];
      if (next === undefined) continue;
      delete pending[key];
      const current = valueOf(property.value);
      // Keep upstream Chinese wording; fill untranslated strings and missing keys.
      if (typeof current === 'string' && current !== next && !/\p{Script=Han}/u.test(current))
        changes.push([property.value.start, property.value.end, JSON.stringify(next)]);
    }
    const additions = Object.entries(pending);
    if (additions.length) changes.push([node.start + 1, node.start + 1,
      additions.map(([key, value]) => JSON.stringify(key) + ':' + JSON.stringify(value)).join(',') + (properties.length ? ',' : '')]);
  }
  for (const [start, end, value] of changes.sort((a, b) => b[0] - a[0]))
    source = source.slice(0, start) + value + source.slice(end);
  return source;
}

function pluginObjects(source) {
  const variables = new Map(), descriptors = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') variables.set(node.id.name, node.init);
    if (node.type === 'ObjectExpression' && node.properties.some(p => keyOf(p) === 'en')) descriptors.push(node);
    for (const [key, child] of Object.entries(node)) {
      if (key === 'start' || key === 'end') continue;
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  }
  visit(acorn.parse(source, {ecmaVersion: 'latest', sourceType: 'module'}));
  return descriptors.flatMap(node => {
    let english = node.properties.find(p => keyOf(p) === 'en')?.value;
    if (english?.type === 'Identifier') english = variables.get(english.name);
    if (english?.type !== 'ObjectExpression') return [];
    const values = Object.fromEntries(english.properties.map(p => [keyOf(p), valueOf(p.value)]));
    const translation = translations.plugins.find(entry => entry.keys.every(key => typeof values[key] === 'string'));
    return translation ? [{node, english: values, translation}] : [];
  });
}

function localizePluginChinese(source) {
  const changes = [];
  for (const {node, translation} of pluginObjects(source)) {
    if (node.properties.some(p => keyOf(p) === 'zh')) continue;
    changes.push([node.start + 1, 'zh:' + JSON.stringify(translation.zh) + ',']);
  }
  for (const [position, value] of changes.sort((a, b) => b[0] - a[0]))
    source = source.slice(0, position) + value + source.slice(position);
  return source;
}

function pluginLocaleFiles(source) {
  const files = new Map();
  for (const {node, translation} of pluginObjects(source)) {
    const chinese = node.properties.find(p => keyOf(p) === 'zh')?.value;
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'ImportExpression') {
        const path = valueOf(node.source);
        if (/^\.\/zh-[^/]+\.js$/.test(path)) files.set(path.slice(2), translation.zh);
      }
      for (const child of Object.values(node)) {
        if (Array.isArray(child)) child.forEach(visit);
        else if (child && typeof child === 'object') visit(child);
      }
    }
    visit(chinese);
  }
  return files;
}

function commandCatalogLocalization(source, parsed) {
  const contexts = parsed.nodes.filter(({node}) => node.type === 'VariableDeclarator' && node.id.type === 'ObjectPattern' && node.init?.type === 'CallExpression');
  const context = name => contexts.find(({node}) => node.init.arguments[0]?.properties?.some(p => keyOf(p) === 'name' && valueOf(p.value) === name))?.node;
  const command = context('Command'), language = context('Language');
  if (!command || !language) return {changes: [], runtime: ''};
  const init = command.init.arguments[0].properties.find(p => keyOf(p) === 'init')?.value;
  const returned = init?.body?.body?.find(n => n.type === 'ReturnStatement')?.argument;
  const catalog = returned?.properties?.find(p => keyOf(p) === 'catalog' && p.kind === 'get');
  if (!catalog) return {changes: [], runtime: ''}; // Older versions have no persisted catalog.
  const memoName = catalog.value.body.body.find(n => n.type === 'ReturnStatement')?.argument?.callee?.name;
  const declarations = init.body.body.flatMap(n => n.type === 'VariableDeclaration' ? n.declarations : []);
  const memo = declarations.find(n => n.id.name === memoName)?.init?.arguments?.[0]?.body;
  const entry = memo?.arguments?.[0]?.body;
  const spread = entry?.properties?.find(p => p.type === 'SpreadElement')?.argument;
  const useLanguage = language.id.properties.find(p => keyOf(p) === 'use')?.value?.name;
  const lang = declarations.find(n => n.init?.callee?.name === useLanguage)?.id?.name;
  if (entry?.type !== 'ObjectExpression' || spread?.type !== 'Identifier' || !lang) throw Error('快捷键目录语言挂载点不匹配');
  const labels = {};
  const english = localeObjects(source).find(locale => locale.kind === 'app')?.values || {};
  for (const [key, chinese] of Object.entries(translations.app))
    if (key.startsWith('command.') && typeof english[key] === 'string') labels[english[key]] = chinese;
  for (const {english, translation} of pluginObjects(source))
    for (const [key, chinese] of Object.entries(translation.zh)) if (key.startsWith('command.')) labels[english[key]] = chinese;
  const data = spread.name;
  return {
    changes: [[entry.end - 1, entry.end - 1, `,title:beautyChineseCatalogText(${data}.title,${lang}.locale()),description:beautyChineseCatalogText(${data}.description,${lang}.locale())`]],
    runtime: `\nfunction beautyChineseCatalogText(text,locale){if(locale!=='zh'||typeof text!=='string')return text;const labels=${JSON.stringify(labels)};return Object.hasOwn(labels,text)?labels[text]:text;}\n`,
  };
}

module.exports = {localizeChinese, localizePluginChinese, localeObjects, pluginObjects, pluginLocaleFiles, commandCatalogLocalization, translations};
