import { test, expect, chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { navigateWorkspace } from './workspace';

test('dashboard validates the labelled fixture, navigates, and stays local', async ({ page }) => {
  const errors: string[] = [];
  const remoteRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:5173/')) remoteRequests.push(request.url()); });
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'Your workspace', exact: true })).toBeVisible();
  await navigateWorkspace(page, 'Help & privacy');
  await page.getByText('Developer tools: validate the contract fixture', { exact: true }).click();
  await page.getByRole('button', { name: 'Validate sample' }).click();
  await expect(page.getByRole('status')).toContainText('Valid version 1 report');
  await expect(page.getByRole('status')).toContainText('Timeline events5');
  await page.getByText('Report format & capture limits', { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Help & privacy');
  await expect(page.getByText('5 MiB', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Local by default' })).toBeVisible();
  await page.reload();
  await page.getByText('Developer tools: validate the contract fixture', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Validate sample' })).toBeVisible();
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test('demo produces actual exception, rejection, deterministic fetch/XHR failures and broken submit', async ({ page, request }) => {
  for (const [path, status] of [['fail-fetch', 503], ['fail-xhr', 502]] as const) {
    const response = await request.get(`http://127.0.0.1:5174/api/${path}`);
    expect(response.status()).toBe(status);
    expect(response.headers()['x-reprokit-demo']).toBe('intentional-failure');
  }
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/');
  await page.getByRole('button', { name: 'Throw error', exact: true }).click();
  await expect.poll(() => errors.some((error) => error.includes('intentional JavaScript exception'))).toBe(true);
  await page.getByRole('button', { name: 'Reject promise' }).click();
  await expect.poll(() => errors.some((error) => error.includes('intentional unhandled rejection'))).toBe(true);
  await page.getByRole('button', { name: 'Fail fetch', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('HTTP 503');
  await page.getByRole('button', { name: 'Fail XHR', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('HTTP 502');
  const posts: string[] = [];
  page.on('request', (request) => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.getByTestId('submit-order').click();
  await expect(page.getByTestId('order-state')).toHaveText('Order: unsaved · Submit attempts: 1');
  await expect(page.getByRole('status')).toContainText('No field values were sent');
  await expect(page.locator('[data-reprokit-mask]')).toContainText('SYNTHETIC_REGION_SECRET_42');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('SYNTHETIC_PASSWORD_88');
  expect(posts).toEqual([]);
});

test('responsive shells fit desktop, tablet, phone and expose keyboard focus', async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [app, port] of [['dashboard', 5173], ['demo', 5174]] as const) {
      await page.goto(`http://127.0.0.1:${port}/`);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.evaluate(() => document.fonts.check('14px "IBM Plex Sans"'))).toBe(true);
      if (width !== 768) await page.screenshot({ path: `docs/screenshots/${app}-${width}.png`, fullPage: true });
    }
  }
  await page.goto('http://127.0.0.1:5173/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  expect(await page.getByRole('link', { name: 'Skip to content' }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
});

test('unpacked MV3 exposes consent and an idle capture page with minimal permissions', async () => {
  const extensionPath = resolve('apps/extension/dist');
  const manifest = JSON.parse(await readFile(resolve(extensionPath, 'manifest.json'), 'utf8'));
  expect(manifest.permissions).toEqual(['activeTab', 'scripting']);
  expect(manifest.host_permissions ?? []).toEqual([]);
  expect(manifest.content_scripts ?? []).toEqual([]);
  for(const name of ['ui','content','page','replay'])expect((await readFile(resolve(extensionPath,`licenses-${name}.md`),'utf8')).length).toBeGreaterThan(100);
  for(const font of ['sans','mono'])expect(await readFile(resolve(extensionPath,`licenses/ibm-plex-${font}.txt`),'utf8')).toMatch(/SIL Open Font License/i);
  expect(await readFile(resolve(extensionPath,'licenses/rrweb.txt'),'utf8')).toContain('2018 Contributors');
  // Chromium hashes the native FilePath bytes (UTF-16LE on Windows).
  const extensionId = createHash('sha256').update(Buffer.from(extensionPath, process.platform === 'win32' ? 'utf16le' : 'utf8')).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, (digit) => String.fromCharCode(97 + parseInt(digit, 16)));
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  try {
    const popup = await context.newPage();
    const errors: string[] = [];
    popup.on('pageerror', (error) => errors.push(error.message));
    await popup.goto(`chrome-extension://${extensionId}/index.html`);
    await expect(popup.getByRole('heading', { name: 'Not recording' })).toBeVisible();
    await expect(popup.getByRole('button', { name: 'Start recording this tab' })).toBeVisible();
    const review = await context.newPage();
    await review.goto(`chrome-extension://${extensionId}/review.html`);
    await expect(review.getByRole('heading', { name: 'Start an investigation', exact: true })).toBeVisible();
    await expect(review.locator('.brand')).toContainText('Not recording');
    await popup.setViewportSize({ width: 360, height: 500 });
    await popup.screenshot({ path: 'docs/screenshots/extension-popup.png' });
    await review.screenshot({ path: 'docs/screenshots/extension-review.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
