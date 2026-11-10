// Run against a separately launched OpenCode test copy with remote debugging.
// Set BEAUTY_PLAYWRIGHT to a Playwright module path when it is not installed locally.
const { chromium } = require(process.env.BEAUTY_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.connectOverCDP(process.env.OPENCODE_CDP_URL || 'http://127.0.0.1:9224');
  const page = browser.contexts().flatMap(context => context.pages()).find(p => p.url() === 'oc://renderer/index.html');
  assert(page, 'OpenCode renderer is available');
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const capture = async name => {
    if (!process.env.BEAUTY_UI_SCREENSHOTS) return;
    fs.mkdirSync(process.env.BEAUTY_UI_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.BEAUTY_UI_SCREENSHOTS, name + '.png') });
  };
  let previousPreset, previousScheme;
  try {
    await page.reload();
    await page.locator('#beauty-shell').waitFor();
    await page.locator('.beauty-rail [aria-label="主页"]').click();
    await page.locator('.beauty-home').waitFor();
    assert.equal(await page.locator('#beauty-shell').count(), 1);
    await capture('home');
    for (const label of ['文件', '编辑', '视图', '帮助']) {
      await page.locator('.beauty-menu-trigger').filter({ hasText: label }).click();
      assert(await page.locator('.beauty-menu-popup .beauty-button').count(), label);
      await page.keyboard.press('Escape');
    }
    await page.keyboard.press('Control+b');
    await page.waitForFunction(() => document.querySelector('#beauty-shell').classList.contains('beauty-collapsed'));
    await page.keyboard.press('Control+b');
    await page.waitForFunction(() => !document.querySelector('#beauty-shell').classList.contains('beauty-collapsed'));

    await page.locator('.beauty-new-chat').click();
    await page.locator('[data-component="composer-editor"]').waitFor();
    const drafts = await page.locator('.beauty-draft-tab').count();
    await page.locator('.beauty-new-chat').click();
    assert.equal(await page.locator('.beauty-draft-tab').count(), drafts, 'Reuse the same project draft');
    await page.locator('.beauty-welcome h1').waitFor();
    await page.waitForFunction(() => {
      const dock = document.querySelector('[data-beauty-draft-content]');
      const main = document.querySelector('main');
      return dock && main && dock.getBoundingClientRect().bottom > main.getBoundingClientRect().bottom - 60;
    });
    const geometry = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
      return { main: rect('main'), dock: rect('[data-beauty-draft-content]'), editor: rect('[data-component="composer-editor"]'), form: rect('[data-component="composer"]'), model: rect('.beauty-composer-trigger') || rect('[data-action="composer-model"]'), send: rect('[data-beauty-send]') };
    });
    assert(geometry.dock && geometry.dock.bottom > geometry.main.bottom - 60, 'Draft composer is at the bottom');
    assert(geometry.form.width > 200 && geometry.editor.height > 0, 'Composer remains usable');
    assert(geometry.send && geometry.send.width === 28 && geometry.send.height === 28, 'Circular 28px send control');
    assert(geometry.model && geometry.model.left > geometry.form.left, 'Model control is visible');
    if (await page.locator('.beauty-reasoning-trigger').count()) {
      await page.locator('.beauty-reasoning-trigger .beauty-composer-strength').click();
      await page.locator('.beauty-reasoning-range').waitFor();
      const animation = await page.locator('.beauty-reasoning-particle').first().evaluate(node => {
        const style = getComputedStyle(node);
        return {timing: style.animationTimingFunction, duration: parseFloat(style.animationDuration), opacity: style.opacity};
      });
      assert.equal(animation.timing, 'linear');
      assert(animation.duration >= 2.7 && animation.duration <= 3.8 && Number(animation.opacity) > 0.4, 'Reasoning bubbles flow continuously at a moderate speed');
      assert.equal(await page.locator('.beauty-reasoning-title').evaluate(node => node.closest('button') === document.querySelector('.beauty-reasoning-model')), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.beauty-reasoning-panel').count(), 0);
    }
    const modelLabel = page.locator('.beauty-composer-model');
    const previousModelLabel = await (await modelLabel.count() ? modelLabel : page.locator('[data-action="composer-model"]')).innerText();
    if (await modelLabel.count()) {
      await modelLabel.click();
      await page.locator('.beauty-reasoning-range').waitFor();
      assert.equal(await page.locator('[data-beauty-model-popover]').count(), 0, 'Model name opens the reasoning panel first');
      await page.locator('.beauty-reasoning-model').click();
    }
    else await page.locator('[data-action="composer-model"]').click();
    await page.locator('[data-beauty-model-popover] [role="dialog"]').waitFor();
    const modelListText = await page.locator('[data-beauty-model-popover] [role="dialog"]').innerText();
    assert(!/^(Recent|最近使用)$/m.test(modelListText), 'Model picker omits the recent group');
    assert(await page.locator('[data-beauty-model-popover] [role="option"]').count() > 0, 'Models remain available in their provider groups');
    const popupGeometry = await page.evaluate(() => ({
      trigger: (document.querySelector('.beauty-composer-trigger') || document.querySelector('[data-action="composer-model"]')).getBoundingClientRect().toJSON(),
      popup: document.querySelector('[data-beauty-model-popover] [role="dialog"]').getBoundingClientRect().toJSON(),
    }));
    assert(popupGeometry.popup.bottom <= popupGeometry.trigger.top - 6, 'Model list opens above the composer control');
    assert(Math.abs(popupGeometry.popup.right - popupGeometry.trigger.right) < 2, 'Model list is aligned to the combined button');
    const overlay = page.locator('[data-component="dialog-overlay"],[data-slot="dialog-overlay"]');
    if (await overlay.count())
      assert.equal(await overlay.first().evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)', 'Model popover does not dim the application');
    await page.keyboard.press('Escape');
    assert.equal(await (await modelLabel.count() ? modelLabel : page.locator('[data-action="composer-model"]')).innerText(), previousModelLabel, 'Opening and dismissing the model list preserves the selected model');
    await capture('draft');

    const session = page.locator('.beauty-session[data-session-id]').first();
    if (await session.count()) {
      await session.click();
      await page.locator('[data-component="session-turn"]').first().waitFor();
      await page.waitForFunction(() => document.querySelectorAll('.beauty-timeline-mark').length > 0);
      await session.dispatchEvent('contextmenu');
      await page.locator('.beauty-session-menu [role="menuitem"]').filter({ hasText: '重命名' }).click();
      await page.locator('.beauty-rename-dialog').waitFor();
      await page.locator('.beauty-rename-dialog button').filter({ hasText: '取消' }).click();
      const more = session.locator('..').locator('.beauty-session-more');
      await more.click({ force: true });
      const labels = await page.locator('.beauty-session-menu [role="menuitem"]').allTextContents();
      for (const label of ['重命名', '导出…', '永久删除']) assert(labels.some(text => text.includes(label)), label);
      await page.keyboard.press('Escape');
      await capture('chat');
    }

    const projectButton = page.locator('.beauty-project').first();
    if (await projectButton.count()) {
      await projectButton.dispatchEvent('contextmenu');
      const projectMenu = page.locator('.beauty-project-menu:not(.beauty-session-menu)');
      await projectMenu.waitFor();
      const labels = await projectMenu.locator('[role="menuitem"]').allTextContents();
      for (const label of ['编辑', '在资源管理器中打开', '移除项目']) assert(labels.includes(label));
      await projectMenu.getByRole('menuitem', {name: '移除项目', exact: true}).click();
      await page.getByRole('dialog', {name: '移除项目', exact: true}).waitFor();
      await page.locator('.beauty-delete-dialog').getByRole('button', {name: '取消', exact: true}).click();
      assert.equal(await projectButton.count(), 1, 'Canceling removal preserves the project');
    }
    await page.locator('.beauty-rail [aria-label="设置"]').click();
    await page.locator('[data-testid="settings-screen"]').waitFor();
    const categories = await page.locator('.settings-nav [role="tab"]').evaluateAll(nodes => nodes.map(node => node.dataset.value));
    assert(categories.length >= 8, 'Native settings categories remain available');
    for (const category of categories) {
      const target = page.locator(`.settings-nav [role="tab"][data-value=${JSON.stringify(category)}]`);
      await target.click();
      assert.equal(await target.getAttribute('aria-selected'), 'true', category);
      await page.locator('.settings-panel').waitFor();
      if (await page.locator('[data-component="interface-mode"]').count())
        assert.equal(await page.locator('[data-component="interface-mode"]').evaluate(node => getComputedStyle(node).display), 'none');
      if (category === 'general') {
        const panel = await page.locator('.settings-panel').innerText();
        for (const text of ['时间轴宽度', '较窄的行便于浏览', '后台活动', '更改的文件']) assert(panel.includes(text), text);
        for (const [title, options] of [['时间轴宽度', ['紧凑', '舒适', '宽阔']], ['后台活动', ['隐藏', '靠左', '居中', '靠右']]]) {
          const row = page.locator('[data-component="settings-row"]').filter({has: page.getByText(title, {exact: true})});
          const trigger = row.locator('[aria-haspopup="listbox"]');
          const triggerId = await trigger.getAttribute('id');
          await trigger.click();
          const list = page.locator('[role="listbox"][aria-labelledby="' + triggerId + '"]');
          await list.waitFor();
          assert.deepEqual(await list.getByRole('option').allTextContents(), options, title + ' options');
          await page.keyboard.press('Escape');
          await list.waitFor({state: 'hidden'});
        }
        await capture('settings-chinese');
      }
      if (category === 'shortcuts') {
        const labels = await page.locator('.settings-panel').innerText();
        for (const english of ['Close browser tab', 'Focus browser address', 'Delete session', 'Rename session']) assert(!labels.includes(english), 'Cached command translated: ' + english);
      }
    }
    await page.locator('.settings-nav [role="tab"][data-value="appearance"]').click();
    await page.locator('.beauty-theme-card').first().waitFor();
    assert.equal(await page.locator('.beauty-settings-head').count(), 1);
    assert.equal(await page.locator('.beauty-theme-card').count(), 9);
    const alignment = await page.evaluate(() => {
      const panel = document.querySelector('.settings-panel');
      const header = panel.querySelector('.settings-tab-header').getBoundingClientRect();
      const card = panel.querySelector('.settings-v2-section:has(.beauty-theme-gallery)').getBoundingClientRect();
      const fonts = panel.querySelector('.settings-tab-body').getBoundingClientRect();
      return {header: header.left, card: card.left, fonts: fonts.left, width: card.width, expectedWidth: header.width};
    });
    assert(Math.abs(alignment.header - alignment.card) < 1 && Math.abs(alignment.fonts - alignment.card) < 1, 'Settings headings, theme panel and fonts share one column');
    assert(Math.abs(alignment.width - alignment.expectedWidth) < 1);
    previousPreset = await page.evaluate(() => window.beautyPresets.current());
    previousScheme = await page.locator('[data-action="beauty-color-scheme"]').getAttribute('data-value');
    const images = await page.evaluate(async () => {
      const results = [];
      for (const preset of window.beautyPresets.list()) {
        window.beautyPresets.select(preset.id);
        if (preset.id === 'default') continue;
        const image = new Image(); image.src = window.beautyPresets.image(preset.id); await image.decode();
        results.push(image.naturalWidth);
      }
      return results;
    });
    assert.equal(images.length, 8); assert(images.every(width => width > 0));
    await page.evaluate(preset => window.beautyPresets.select(preset), previousPreset);
    for (const scheme of ['light', 'dark']) {
      await page.locator('[data-action="beauty-color-scheme"]').click();
      await page.locator(`.beauty-select-option[data-value="${scheme}"]`).click();
      await page.waitForFunction(value => document.documentElement.dataset.beautyTheme === value, scheme);
      await capture('settings-' + scheme);
    }
    await page.locator('.beauty-settings-search').fill('不存在的设置回归测试');
    const nativeResults = page.locator('.settings-search [data-slot="search-list-results"]');
    if (await nativeResults.count()) {
      await page.waitForFunction(() => document.querySelectorAll('.settings-search [role="option"]').length === 0);
      assert.equal(await nativeResults.locator('[role="option"]').count(), 0);
      await page.locator('.beauty-settings-search').fill('主题');
      await nativeResults.locator('[role="option"]').first().waitFor();
    } else {
      assert(await page.locator('.beauty-settings-filtered').count());
    }
    await page.locator('.beauty-settings-search').fill('');
    await page.locator('[data-action="beauty-color-scheme"]').click();
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-action="beauty-color-scheme"]').getAttribute('data-value'), 'light');
    await page.locator('[data-action="beauty-color-scheme"]').click();
    await page.locator(`.beauty-select-option[data-value="${previousScheme}"]`).click();
    await page.evaluate(preset => window.beautyPresets.select(preset), previousPreset);
    await page.locator('.beauty-settings-back,.settings-nav>.settings-back').click();
    await page.locator('[data-testid="settings-screen"]').waitFor({ state: 'detached' });
    assert.deepEqual(errors, [], 'No renderer exceptions during the complete flow');
    console.log(`PASS: native home, menus, Ctrl+B, drafts, composer/model/reasoning, sessions/timeline, ${categories.length} settings categories, search, 9 presets, 8 decoded images, light/dark and keyboard selection; no renderer errors`);
  } finally {
    if (previousPreset !== undefined) await page.evaluate(value => window.beautyPresets.select(value), previousPreset).catch(() => {});
    if (previousScheme !== undefined && await page.locator('[data-action="beauty-color-scheme"]').count()) {
      await page.keyboard.press('Escape').catch(() => {});
      if (await page.locator('[data-action="beauty-color-scheme"]').getAttribute('data-value') !== previousScheme) {
        await page.locator('[data-action="beauty-color-scheme"]').click();
        await page.locator(`.beauty-select-option[data-value="${previousScheme}"]`).click();
      }
    }
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
