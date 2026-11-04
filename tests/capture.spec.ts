import { test, expect } from '@playwright/test';
import { launch, openCapture, start, reportFrom } from './extension';

test('real extension captures demo evidence with no sensitive values and leaves application APIs intact', async () => {
  const context = await launch();
  try {
    const source = await context.newPage();
    await source.goto('http://127.0.0.1:5174/?token=SYNTHETIC_URL_SECRET#PRIVATE_FRAGMENT');
    const unselected = await context.newPage();
    await unselected.goto('http://127.0.0.1:5174/');
    const apiHandles = await source.evaluateHandle(() => ({ fetch: window.fetch, open: XMLHttpRequest.prototype.open, send: XMLHttpRequest.prototype.send }));
    const review = await start(context, source);
    await expect(unselected.locator('[data-reprokit-ui]')).toHaveCount(0);
    await unselected.evaluate(() => { setTimeout(() => { throw new Error('UNSELECTED_SECRET'); }, 0); });
    const errors: string[] = [];
    source.on('pageerror', (error) => errors.push(error.message));
    await source.getByRole('button', { name: 'Throw error', exact: true }).click();
    await source.getByRole('button', { name: 'Reject promise' }).click();
    await source.getByRole('button', { name: 'Fail fetch', exact: true }).click();
    await expect(source.getByRole('status')).toContainText('HTTP 503');
    await source.getByRole('button', { name: 'Fail XHR', exact: true }).click();
    await expect(source.getByRole('status')).toContainText('HTTP 502');
    await source.getByLabel('Email', { exact: true }).fill('MUTATED_SECRET@example.invalid');
    await source.getByLabel('Order notes').fill('MUTATED_TEXTAREA_SECRET');
    await source.getByTestId('submit-order').click();
    await source.evaluate(() => {
      const node = document.createElement('div'); node.textContent = 'MUTATED_TEXT_SECRET'; node.setAttribute('data-secret', 'MUTATED_ATTRIBUTE_SECRET'); document.body.append(node);
      window.postMessage({ channel: 'reprokit-diagnostic-v2', sessionId: 'wrong', kind: 'error', event: { type: 'exception', message: 'FORGED_SECRET' } }, location.origin);
      history.pushState({}, '', '/SYNTHETIC_PATH_SECRET?token=PRIVATE_QUERY#PRIVATE_HASH');
    });
    expect(await source.evaluate((original) => original.fetch === window.fetch && original.open === XMLHttpRequest.prototype.open && original.send === XMLHttpRequest.prototype.send, apiHandles)).toBe(true);
    await expect.poll(() => errors.length).toBe(2);
    await review.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await expect(review.locator('.notice')).toContainText('Recording stopped');
    await expect(source.locator('[data-reprokit-ui]')).toHaveCount(0);
    const report = await reportFrom(review);
    expect(report.formatVersion).toBe(4);
    expect(report.evidence.kind).toBe('web');
    if (report.evidence.kind !== 'web') throw new Error('Missing web evidence');
    expect(report.evidence.replay?.some((event) => event.type === 2)).toBe(true);
    expect(report.evidence.errors.map((event) => event.type)).toEqual(expect.arrayContaining(['exception', 'unhandled-rejection']));
    expect(report.evidence.errors).toHaveLength(2);
    expect(report.evidence.failedRequests.map((event) => [event.transport, event.status])).toEqual(expect.arrayContaining([['fetch', 503], ['xhr', 502]]));
    expect(report.evidence.actions.some((event) => event.type === 'input')).toBe(true);
    expect(report.evidence.actions.some((event) => event.type === 'navigation')).toBe(true);
    const json = JSON.stringify(report);
    expect(json).not.toMatch(/SYNTHETIC_|MUTATED_|PRIVATE_|FORGED_|synthetic-person@example\.invalid/);
    expect(json).not.toContain('RECORDING');
    expect(report.evidence.failedRequests.every((event) => event.method === 'OTHER')).toBe(true);
    const afterStopMessages = await source.evaluate(() => new Promise<number>((resolve) => {
      let count = 0;
      const listener = (event: MessageEvent) => { if (event.data?.channel === 'reprokit-diagnostic-v2') count++; };
      window.addEventListener('message', listener);
      setTimeout(() => { throw new Error('AFTER_STOP_SECRET'); }, 0);
      setTimeout(() => { window.removeEventListener('message', listener); resolve(count); }, 100);
    }));
    expect(afterStopMessages).toBe(0);
    await expect.poll(() => errors.length).toBe(3);
    await review.getByText('Inspect report JSON', { exact: true }).click();
    await review.screenshot({ path: 'docs/screenshots/phase2-capture-stopped.png', fullPage: true });
    for (const width of [768, 390]) {
      await review.setViewportSize({ width, height: 900 });
      expect(await review.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await review.screenshot({ path: `docs/screenshots/phase2-capture-${width}.png`, fullPage: true });
    }
    await review.getByRole('button', { name: 'Remove report', exact: true }).click();
    await review.getByRole('dialog').getByRole('button', { name: 'Remove report', exact: true }).click();
    await expect(review.locator('.notice')).toContainText('Capture discarded');
    await expect(review.getByTestId('capture-json')).toHaveCount(0);
  } finally { await context.close(); }
});

test('reload and full navigation stop recording without resuming, retaining the partial report', async () => {
  for (const mode of ['reload', 'navigation'] as const) {
    const context = await launch();
    try {
      const source = await context.newPage(); await source.goto('http://127.0.0.1:5174/');
      const review = await start(context, source);
      await source.getByTestId('submit-order').click();
      if (mode === 'reload') await source.reload(); else await source.goto('http://127.0.0.1:5174/new-document');
      await expect(review.locator('.notice')).toContainText('Recording stopped');
      await expect(source.locator('[data-reprokit-ui]')).toHaveCount(0);
      const report = await reportFrom(review);
      expect(report.timeline.at(-1)?.label).toMatch(/navigation|connection-lost/);
      expect(report.evidence.kind === 'web' && report.evidence.actions.length).toBeGreaterThan(0);
    } finally { await context.close(); }
  }
});

test('closing source or capture page stops cleanly; no report survives capture-page reload', async () => {
  const context = await launch();
  try {
    let source = await context.newPage(); await source.goto('http://127.0.0.1:5174/');
    let review = await start(context, source);
    await source.close();
    await expect(review.locator('.notice')).toContainText('Recording stopped');
    expect((await reportFrom(review)).timeline.at(-1)?.label).toMatch(/tab-closed|navigation|connection-lost/);
    await review.close();
    source = await context.newPage(); await source.goto('http://127.0.0.1:5174/');
    review = await start(context, source);
    await review.reload();
    await expect(source.locator('[data-reprokit-ui]')).toHaveCount(0);
    await expect(review.getByRole('heading',{name:'Start an investigation',exact:true})).toBeVisible();
    await expect(review.getByTestId('capture-json')).toHaveCount(0);
    await review.close();
  } finally { await context.close(); }
});

test('trusted in-page discard works and removing the indicator fails closed', async () => {
  const context = await launch();
  try {
    const source = await context.newPage(); await source.goto('http://127.0.0.1:5174/');
    let review = await start(context, source);
    const bounds = await source.locator('[data-reprokit-ui]').boundingBox();
    if (!bounds) throw new Error('Missing recording indicator');
    await source.screenshot({ path: 'docs/screenshots/phase2-recording-indicator.png' });
    await source.mouse.click(bounds.x + bounds.width - 35, bounds.y + bounds.height / 2);
    await expect(review.locator('.notice')).toContainText('Capture discarded');
    await expect(source.locator('[data-reprokit-ui]')).toHaveCount(0);
    await review.close();
    review = await start(context, source);
    await source.evaluate(() => document.querySelector('[data-reprokit-ui]')?.remove());
    await expect(review.locator('.notice')).toContainText('indicator-removed');
    await expect(review.locator('.notice')).toContainText('Recording stopped');
  } finally { await context.close(); }
});

test('unsupported pages and missing temporary permission report useful errors without recording', async () => {
  const context = await launch();
  try {
    const source = await context.newPage(); await source.goto('http://127.0.0.1:5174/');
    let review = await openCapture(context, source, false);
    await expect(review.getByRole('alert')).toContainText('authorized HTML tab');
    await expect(source.locator('[data-reprokit-ui]')).toHaveCount(0);
    await review.close();
    await source.goto('chrome://version/');
    review = await openCapture(context, source);
    await expect(review.getByRole('alert')).toContainText('unsupported');
    await expect(review.getByTestId('capture-json')).toHaveCount(0);
  } finally { await context.close(); }
});

test('capture works under a strict page CSP without patching application APIs', async () => {
  const context = await launch();
  try {
    const source = await context.newPage();
    // Always use production: Vite's inline development preamble cannot run under this CSP.
    await source.route('http://127.0.0.1:5178/', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self'" } });
    });
    await source.goto('http://127.0.0.1:5178/');
    const review = await start(context, source);
    await source.getByTestId('submit-order').click();
    await expect(source.getByTestId('order-state')).toContainText('Submit attempts: 1');
    await review.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await expect(review.locator('.notice')).toContainText('Recording stopped');
    expect((await reportFrom(review)).capabilities.replay).toBe('available');
  } finally { await context.close(); }
});

test('stop remains final when requested as soon as the capture page opens', async () => {
  const context = await launch();
  try {
    const source = await context.newPage(); await source.goto('http://127.0.0.1:5174/');
    const review = await openCapture(context, source);
    await review.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await expect(review.locator('.notice')).toContainText('Recording stopped');
    await expect(source.locator('[data-reprokit-ui]')).toHaveCount(0);
    await source.getByTestId('submit-order').click();
    await expect(source.getByTestId('order-state')).toContainText('Submit attempts: 1');
    await expect(review.locator('.notice')).toContainText('Recording stopped');
    await expect(source.locator('[data-reprokit-ui]')).toHaveCount(0);
  } finally { await context.close(); }
});
