const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Archive } = require('./asar.cjs');
const patch = require('./patch.cjs');
const { discover, localizePairing } = require('./native-v2.cjs');

const installed = patch.paths(patch.defaultFolder);
const arc = new Archive(fs.existsSync(installed.b) ? installed.b : installed.a);
const main = [...arc.index.keys()].find(name => /^out\/renderer\/assets\/main-.*\.js$/.test(name));
const source = arc.read(main).toString();
const native = !source.includes('function NewLayout(props) {');

test('Separated pairing locale descriptors gain Chinese while existing translations stay intact', () => {
  const english = {title: 'Pairing', 'pair.title': 'Pair a device', 'remote.title': 'Remote access', 'screenActive.title': 'Keep screen active', qr: 'Pairing QR code'};
  const descriptor = 'const locale={i18n:{en:' + JSON.stringify(english) + '}};';
  const translated = localizePairing(descriptor);
  const locale = require('node:vm').runInNewContext(translated + 'locale');
  assert.equal(locale.i18n.zh.title, '配对');
  assert.equal(locale.i18n.en.title, 'Pairing');
  const existing = 'const locale={i18n:{en:' + JSON.stringify(english) + ',zh:{title:"已有翻译"}}};';
  assert.equal(localizePairing(existing), existing);
  const unrelated = 'const locale={i18n:{en:{title:"Pairing"}}};';
  assert.equal(localizePairing(unrelated), unrelated);
});

test('Solid reaction schedulers cannot replace the effect used by onMount', { skip: !native }, () => {
  const expected = discover(source).aliases;
  const decoy = 'function beautyDiscoveryReaction(e){let r={};r.suspense=e;r.user=!0;return e=>e();}\n';
  const actual = discover(decoy + source).aliases;
  assert.equal(actual.createEffect, expected.createEffect);
  assert.equal(actual.onMount, expected.onMount);
  assert.notEqual(actual.createEffect, 'beautyDiscoveryReaction');
});

test('Filename discovery distinguishes parser searches and refuses ambiguous path helpers', { skip: !native }, () => {
  const expected = discover(source).aliases.getFilename;
  const parser = 'function beautyDiscoveryParser(value,index){if(!value)return "";return value.slice(value.lastIndexOf(index),value.lastIndexOf(index+1));}\n';
  assert.equal(discover(parser + source).aliases.getFilename, expected);
  const duplicate = String.raw`function beautyDiscoveryFilename(value){if(!value)return "";return value.slice(Math.max(value.lastIndexOf('/'),value.lastIndexOf('\\'))+1);}`;
  assert.throws(() => discover(duplicate + source), /无法唯一识别：filename/);
});

test('Both vertical and inbox-era native sidebar conditions migrate without changing unrelated UI', { skip: !native }, () => {
  const d = discover(source);
  const comparisons = d.parsed.nodes.filter(({ node }) => {
    if (node.type !== 'BinaryExpression' || node.start < d.layout.start || node.end > d.layout.end) return false;
    const value = node.right.value ?? node.right.quasis?.[0]?.value.cooked;
    return source.slice(node.left.start, node.left.end).endsWith('.appearance.tabLayout()') &&
      ((node.operator === '===' && value === 'vertical') || (node.operator === '!==' && value === 'horizontal'));
  });
  assert.equal(comparisons.length, 1);
  const node = comparisons[0].node;
  const left = source.slice(node.left.start, node.left.end);
  for (const condition of [left + '===`vertical`', left + '!==`horizontal`']) {
    const changed = source.slice(0, node.start) + condition + source.slice(node.end) +
      '\nfunction beautyUnrelatedTabs(p){return p.appearance.tabLayout()===`vertical`;}';
    const result = patch.build({ index: arc.index, read: name => name === main ? Buffer.from(changed) : arc.read(name) });
    const output = result.replacements[main].toString();
    assert(output.includes('function beautyUnrelatedTabs(p){return p.appearance.tabLayout()===`vertical`;}'));
    assert(!output.slice(d.layout.start, d.layout.end + 50).includes(condition));
    const appearance = Object.values(result.replacements).map(data => data.toString()).find(code => code.includes('window.beautyAppearanceSection({controller:'));
    assert(appearance.indexOf('settings.appearance.description') < appearance.indexOf('window.beautyAppearanceSection({controller:'), 'Native appearance heading precedes custom controls');
    assert(appearance.indexOf('window.beautyAppearanceSection({controller:') < appearance.indexOf('settings-color-scheme'), 'Custom controls precede the native font/settings group');
    assert(!output.includes("heading.textContent='外观';section.append(heading);"), 'Native appearance keeps a single page heading');
  }
});
