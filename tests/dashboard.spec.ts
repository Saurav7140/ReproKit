import { test, expect } from '@playwright/test';
import fixture from '../packages/core/fixtures/web-report.json' with { type: 'json' };
import { parseReport } from '@reprokit/core';
import { navigateWorkspace, editReportDetails, chooseAppearance as appearance } from './workspace';

test('workspace makes the first actions clear, routes back correctly and opens a real masked example on demand', async ({ page }) => {
  const posts: string[] = []; page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'Start with a report', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import report', exact: true })).toBeVisible();
  await navigateWorkspace(page, 'Capture'); await expect(page.getByRole('heading', { name: 'Record the tab where the bug happens', exact: true })).toBeVisible();
  await page.goBack(); await expect(page.getByRole('heading', { name: 'Your workspace', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open example report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Example: checkout submission fails', exact: true })).toBeVisible();
  await expect(page.getByLabel('Report title', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Replay', exact: true }).click(); await expect(page.getByText('Replay paused', { exact: true })).toBeVisible();
  await page.getByText('Inspect report JSON', { exact: true }).click(); const report = parseReport(await page.getByTestId('capture-json').innerText());
  expect(report.source.method).toBe('chromium-extension'); expect(report.evidence.kind === 'web' && report.evidence.replay?.some(event => event.type === 2)).toBe(true); expect(JSON.stringify(report)).not.toMatch(/SYNTHETIC_|EXAMPLE_SECRET/);
  await editReportDetails(page); await page.getByLabel('Report title', { exact: true }).fill('Unsaved example edit');
  await navigateWorkspace(page, 'Overview'); await expect(page.getByText('Unsaved detail edits', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Open example report', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Open the example report?', exact: true })).toBeVisible(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Unsaved example edit|Example: checkout submission fails/ }).click(); await expect(page.getByLabel('Report title', { exact: true })).toHaveValue('Unsaved example edit');
  expect(posts).toEqual([]);
});

test('light, dark and system appearances persist, follow the system and preserve captured replay colours', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('http://127.0.0.1:5173/'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button',{name:'Dark theme',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'Use system appearance',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Light theme',exact:true}).focus();await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await expect(page.getByRole('button',{name:'Light theme',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'Use system appearance',exact:true})).toHaveAttribute('aria-pressed','false');
  await appearance(page, 'light'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light'); await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await appearance(page, 'system'); await page.emulateMedia({ colorScheme: 'light' }); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');await expect(page.getByRole('button',{name:'Light theme',exact:true})).toHaveAttribute('aria-pressed','true'); await page.emulateMedia({ colorScheme: 'dark' }); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');await expect(page.getByRole('button',{name:'Dark theme',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(() => localStorage.getItem('reprokit-appearance'))).toBe('system');
  for (const value of ['light', 'dark'] as const) {
    await page.setViewportSize({ width: 1440, height: 1000 }); await appearance(page, value);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `docs/screenshots/dashboard-overview-${value}-${width}.png`, fullPage: true });
      if (width === 1440) await page.locator('.workspace-sidebar .appearance-control').screenshot({path:`docs/screenshots/appearance-dashboard-${value}.png`});
      if (width === 390) { await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.screenshot({path:`docs/screenshots/appearance-dashboard-menu-${value}.png`});await page.getByRole('button',{name:'Close navigation',exact:true}).click(); }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.getByRole('button', { name: 'Open example report', exact: true }).click(); await page.getByRole('button', { name: 'Replay', exact: true }).click(); await expect(page.getByText('Replay paused', { exact: true })).toBeVisible();
  const recordedBody = page.frames().find(frame => frame.url().startsWith('data:text/html'))!.childFrames()[0]!.locator('body'); const capturedBackground = await recordedBody.evaluate(element => getComputedStyle(element).backgroundColor);
  await appearance(page, 'light'); expect(await recordedBody.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(capturedBackground); await appearance(page, 'dark');
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/screenshots/dashboard-report-dark-${width}.png`, fullPage: true });
    await page.locator('.replay-frame').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `docs/screenshots/dashboard-replay-viewport-dark-${width}.png` });
  }
});

test('mobile navigation supports keyboard dismissal and resize without leaving the document blocked', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 }); await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click(); await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
  await navigateWorkspace(page, 'Projects'); await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible(); await expect(page.getByRole('dialog', { name: 'Workspace navigation', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click(); await page.setViewportSize({ width: 1440, height: 900 }); await expect(page.getByRole('dialog', { name: 'Workspace navigation', exact: true })).not.toBeVisible(); await navigateWorkspace(page, 'Reports'); await expect(page.getByRole('heading', { name: 'Your investigation starts here', exact: true })).toBeVisible();
});

test('appearance still works when preference storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('storage disabled'); }; }); await page.goto('http://127.0.0.1:5173/'); await appearance(page, 'dark'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark'); await appearance(page, 'light'); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('opening an example never overwrites a report imported while its chunk is delayed', async ({ page }) => {
  let release: (() => void) | undefined;
  await page.route('**/assets/checkout.reprokit-*.js', async route => { await new Promise<void>(done => { release = done; }); await route.continue(); });
  await page.goto('http://127.0.0.1:5173/'); await page.getByRole('button', { name: 'Open example report', exact: true }).click(); await expect.poll(() => typeof release).toBe('function');
  await page.locator('input[type=file]').setInputFiles({ name: 'imported.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) }); await expect(page.getByRole('heading', { name: fixture.title, exact: true })).toBeVisible(); const loaded = page.waitForResponse(response => /\/assets\/checkout\.reprokit-.*\.js/.test(response.url())); release!(); await loaded; await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(page.getByRole('heading', { name: fixture.title, exact: true })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Example: checkout submission fails', exact: true })).toHaveCount(0);
});

test('a pending file import blocks example replacement and cancellation ignores a late read', async ({ page }) => {
  await page.addInitScript(() => {
    File.prototype.text = function () { return new Promise<string>(resolve => { Reflect.set(window, 'finishImport', resolve); }); };
  });
  await page.goto('http://127.0.0.1:5173/?view=reports');
  await page.locator('input[type=file]').setInputFiles({ name:'pending.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture)) });
  await expect(page.getByRole('button', { name:'Cancel import',exact:true })).toBeVisible();
  await navigateWorkspace(page, 'Overview');
  await expect(page.getByRole('button', { name:'Open example report',exact:true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Reading a local report');
  await navigateWorkspace(page, 'Reports'); await page.getByRole('button', { name:'Cancel import',exact:true }).click();
  await navigateWorkspace(page, 'Overview'); await page.getByRole('button', { name:'Open example report',exact:true }).click();
  await expect(page.getByRole('heading', { name:'Example: checkout submission fails',exact:true })).toBeVisible();
  await page.evaluate(data => Reflect.get(window, 'finishImport')(data), JSON.stringify(fixture));
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(page.getByRole('heading', { name:'Example: checkout submission fails',exact:true })).toBeVisible();
});

test('browser Back cancels a pending example without opening it on another screen', async ({ page }) => {
  let release: (() => void) | undefined;
  await page.route('**/assets/checkout.reprokit-*.js', async route => { await new Promise<void>(done => { release = done; }); await route.continue(); });
  await page.goto('http://127.0.0.1:5173/'); await navigateWorkspace(page, 'Reports');
  await page.getByRole('button', { name:'Open example report',exact:true }).click(); await expect.poll(() => typeof release).toBe('function');
  await page.goBack(); await expect(page.getByRole('heading', { name:'Your workspace',exact:true })).toBeVisible();
  const loaded = page.waitForResponse(response => /\/assets\/checkout\.reprokit-.*\.js/.test(response.url())); release!(); await loaded;
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(page.getByRole('heading', { name:'Your workspace',exact:true })).toBeVisible();
  await navigateWorkspace(page, 'Reports'); await expect(page.getByRole('heading', { name:'Your investigation starts here',exact:true })).toBeVisible();
});
