import { navigateWorkspace, editReportDetails, chooseAppearance } from './workspace';
import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import fixture from '../packages/core/fixtures/web-report.json' with { type: 'json' };
import { parseReport, type Report } from '../packages/core/src/report';
import { launch, start, reportFrom, extensionId } from './extension';

function replayFixture(): Report {
  const timestamp = Date.parse(fixture.capture.startedAt);
  return parseReport(JSON.stringify({ ...fixture, formatVersion: 2, title: 'Synthetic replay security fixture', capabilities: { ...fixture.capabilities, replay: 'available' }, evidence: { ...fixture.evidence, replay: [
    { type: 4, timestamp, data: { href: 'http://127.0.0.1:5174/', width: 800, height: 600 } },
    { type: 2, timestamp: timestamp + 250, data: { initialOffset: { left: 0, top: 0 }, node: { type: 0, id: 1, childNodes: [{ type: 1, id: 2, name: 'html', publicId: '', systemId: '' }, { type: 2, id: 3, tagName: 'html', attributes: {}, childNodes: [{ type: 2, id: 4, tagName: 'head', attributes: {}, childNodes: [] }, { type: 2, id: 5, tagName: 'body', attributes: {}, childNodes: [{ type: 2, id: 6, tagName: 'button', attributes: {}, childNodes: [{ type: 3, id: 7, textContent: '[masked]' }] }] }] }] } } },
    { type: 3, timestamp: timestamp + 1500, data: { source: 0, texts: [], attributes: [], removes: [], adds: [{ parentId: 5, nextId: null, node: { type: 2, id: 8, tagName: 'span', attributes: {}, childNodes: [{ type: 3, id: 9, textContent: '[masked]' }] } }] } },
    { type: 1, timestamp: timestamp + 4000, data: {} },
  ] } }));
}
async function importReport(page: Page, value: unknown) {
  await page.locator('input[type=file]').setInputFiles({ name: 'test.reprokit.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
}

test('extension investigation explains the first steps, supports themes and keeps sharing optional', async () => {
  const context=await launch();
  try {
    const page=await context.newPage();await page.goto(`chrome-extension://${extensionId}/review.html`);
    await expect(page.getByRole('heading',{name:'Start an investigation',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Import report',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Connect to dashboard',exact:true})).toBeHidden();
    await expect(page.getByRole('heading',{name:'Need to record a new problem?',exact:true})).toBeVisible();
    expect(await page.locator('.review-import > p').first().evaluate(node=>getComputedStyle(node).fontSize)).toBe('14px');
    await page.getByRole('button',{name:'Dark theme',exact:true}).focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('button',{name:'Dark theme',exact:true})).toHaveAttribute('aria-pressed','true');
    await chooseAppearance(page,'system');await page.emulateMedia({colorScheme:'light'});await expect(page.getByRole('button',{name:'Light theme',exact:true})).toHaveAttribute('aria-pressed','true');
    for(const theme of ['light','dark']) {
      await chooseAppearance(page,theme);
      for(const width of [1440,768,390]) {await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/screenshots/investigation-start-${theme}-${width}.png`,fullPage:true});await page.locator('.appearance-control').screenshot({path:`docs/screenshots/appearance-investigation-${theme}-${width}.png`});}
    }
    await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await importReport(page,fixture);await expect(page.getByRole('heading',{name:'Review your report',exact:true})).toBeVisible();
    await expect(page.getByLabel('Report title',{exact:true})).toBeHidden();
    await editReportDetails(page);await page.getByLabel('Report title',{exact:true}).fill('Investigation draft');
    await page.locator('.review-sharing > summary').click();await expect(page.getByRole('button',{name:'Connect to dashboard',exact:true})).toBeVisible();
    await page.locator('.review-sharing > summary').click();await expect(page.getByLabel('Report title',{exact:true})).toHaveValue('Investigation draft');
    await page.getByRole('button',{name:'Save details',exact:true}).click();
    for(const width of [1440,768,390]) {await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/screenshots/investigation-report-dark-${width}.png`,fullPage:true});}
    expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual(['reprokit-appearance']);
    await page.getByRole('button',{name:'Remove report',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Remove report',exact:true}).click();
    await expect(page.getByRole('button',{name:'Import report',exact:true})).toBeFocused();
  }finally{await context.close();}
});

for (const viewer of ['dashboard', 'extension']) {
  test(`${viewer} imports, replays and isolates a valid v2 security fixture`, async ({ page: dashboardPage, context: dashboardContext }) => {
    const extension = viewer === 'extension' ? await launch() : null;
    const page = extension ? await extension.newPage() : dashboardPage;
    const context = extension ?? dashboardContext;
    try {
      await page.goto(extension ? `chrome-extension://${extensionId}/review.html` : 'http://127.0.0.1:5173/');
      await importReport(page, replayFixture());
      await expect(page.getByRole('heading', { name: 'Synthetic replay security fixture' })).toBeVisible();
      await page.getByRole('button', { name: 'Replay', exact: true }).click();
      const region = page.getByRole('region', { name: 'DOM replay', exact: true });
      await expect(region.getByText('This older recording has no captured page styling.', { exact: false })).toBeVisible();
      await expect(region.getByRole('status')).toHaveText('Replay paused', { timeout: 15_000 });
      const outer = page.frames().find((frame) => frame.url().startsWith('data:text/html'))!;
      const inner = outer.childFrames()[0]!;
      await expect(inner.locator('body')).toContainText('[masked]');
      const isolation = await outer.evaluate(() => {
        let parentBlocked = false;
        try { void parent.document.body; } catch { parentBlocked = true; }
        return { parentBlocked, origin: self.origin, scripts: document.querySelector('iframe')?.sandbox.contains('allow-scripts'), runtime: typeof (window as typeof window & { chrome?: { runtime?: unknown } }).chrome?.runtime };
      });
      expect(isolation).toEqual({ parentBlocked: true, origin: 'null', scripts: false, runtime: 'undefined' });
      expect(await page.locator('iframe[title="Isolated DOM session replay"]').evaluate((element) => (element as HTMLIFrameElement).contentDocument === null)).toBe(true);
      let networkRequests = 0;
      await context.route('http://127.0.0.1:5174/replay-probe', (route) => { networkRequests++; return route.fulfill({ body: 'unexpected', headers: { 'access-control-allow-origin': '*' } }); });
      expect(await outer.evaluate(async () => { try { await fetch('http://127.0.0.1:5174/replay-probe'); return false; } catch { return true; } })).toBe(true);
      expect(networkRequests).toBe(0);
      const scriptsRan = await outer.evaluate(() => new Promise<boolean>((resolve) => {
        let ran = false; const listener = (event: MessageEvent) => { if (event.data === 'REPLAY_SCRIPT_RAN') ran = true; };
        addEventListener('message', listener);
        const script = document.createElement('script'); script.textContent = "parent.postMessage('REPLAY_SCRIPT_RAN', '*')";
        document.querySelector('iframe')!.contentDocument!.body.append(script);
        setTimeout(() => { removeEventListener('message', listener); resolve(ran); }, 100);
      }));
      expect(scriptsRan).toBe(false);
      await region.getByRole('button', { name: 'Play replay' }).click();
      await expect(region.getByRole('button', { name: 'Pause replay' })).toBeEnabled();
      await expect.poll(async () => Number(await region.getByLabel('Replay position').inputValue())).toBeGreaterThan(0);
      await region.getByRole('button', { name: 'Pause replay' }).click();
      await region.getByLabel('Replay position').focus(); await page.keyboard.press('End');
      await expect(inner.locator('span')).toHaveCount(1);
      await page.keyboard.press('Home');
      await expect(region.getByLabel('Replay position')).toHaveValue('0');
      await expect(inner.locator('span')).toHaveCount(0);
      await page.keyboard.press('ArrowRight');
      await expect(region.getByLabel('Replay position')).toHaveValue('1');
      await region.getByRole('button', { name: 'Play replay' }).click();
      await expect(region.getByRole('button', { name: 'Pause replay' })).toBeEnabled();
      await expect(region.getByRole('button', { name: 'Play replay' })).toBeEnabled({ timeout: 6000 });
      await expect(region.getByLabel('Replay position')).toHaveValue('4000');
    } finally { await extension?.close(); }
  });
}

test('real capture exports and imports into clean account-free dashboard and extension viewers', async ({ browser }, testInfo) => {
  const producer = await launch();
  try {
    const source = await producer.newPage(); await source.goto('http://127.0.0.1:5174/');
    const presentation = await source.locator('.demo-grid').evaluate((element) => ({ display: getComputedStyle(element).display, columns: getComputedStyle(element).gridTemplateColumns, gap: getComputedStyle(element).columnGap }));
    const review = await start(producer, source);
    await source.getByRole('button', { name: 'Throw error', exact: true }).click();
    await source.getByRole('button', { name: 'Reject promise' }).click();
    await source.getByRole('button', { name: 'Fail fetch', exact: true }).click(); await expect(source.getByRole('status')).toContainText('503');
    await source.getByRole('button', { name: 'Fail XHR', exact: true }).click(); await expect(source.getByRole('status')).toContainText('502');
    await review.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await expect(review.getByRole('button', { name: 'Export report', exact: true })).toBeVisible();
    await editReportDetails(review);await review.getByLabel('Report title', { exact: true }).fill('Checkout failures from real capture');
    await review.getByLabel('Description', { exact: true }).fill('Clicked the four deliberate demo failures. No account or setup credentials.');
    await expect(review.getByRole('button', { name: 'Export report', exact: true })).toBeDisabled();
    await review.getByRole('button', { name: 'Save details' }).click();
    const downloading = review.waitForEvent('download'); await review.getByRole('button', { name: 'Export report', exact: true }).click();
    const download = await downloading; expect(download.suggestedFilename()).toMatch(/^[0-9a-f-]{36}\.reprokit\.json$/);
    const path = testInfo.outputPath(download.suggestedFilename()); await download.saveAs(path);
    const exported = parseReport(await readFile(path, 'utf8'));
    expect(exported.title).toBe('Checkout failures from real capture');
    expect(JSON.stringify(exported)).not.toContain('SYNTHETIC_');
    const clean = await browser.newContext();
    try {
      const viewer = await clean.newPage(); await viewer.goto('http://127.0.0.1:5173/'); await viewer.locator('input[type=file]').setInputFiles(path);
      await expect(viewer.getByRole('heading', { name: exported.title })).toBeVisible();
      await viewer.getByRole('button', { name: 'Errors', exact: true }).click();
      await expect(viewer.getByRole('region', { name: 'Errors evidence' })).toContainText('unhandled-rejection');
      await viewer.getByRole('button', { name: 'Failed requests', exact: true }).click();
      await expect(viewer.getByRole('region', { name: 'Failed requests evidence' })).toContainText('503');
      await expect(viewer.getByRole('region', { name: 'Failed requests evidence' })).toContainText('502');
      await viewer.getByRole('button', { name: 'Replay', exact: true }).click();
      await expect(viewer.getByRole('region', { name: 'DOM replay' }).getByRole('status')).toHaveText('Replay paused', { timeout: 15_000 });
      const sandbox = viewer.frames().find((frame) => frame.url().startsWith('data:text/html'))!;
      await viewer.locator('iframe[title="Isolated DOM session replay"]').scrollIntoViewIfNeeded();
      await expect(sandbox.locator('iframe')).toBeVisible();
      await expect(sandbox.childFrames()[0]!.locator('body')).toContainText('[masked]');
      await expect(sandbox.childFrames()[0]!.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await sandbox.childFrames()[0]!.locator('main > div').nth(1).evaluate((element) => ({ display: getComputedStyle(element).display, columns: getComputedStyle(element).gridTemplateColumns, gap: getComputedStyle(element).columnGap }))).toEqual(presentation);
      await expect.poll(() => sandbox.locator('iframe').evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(480);
      await viewer.screenshot({ path: 'docs/screenshots/phase3-dashboard-replay.png' });
    } finally { await clean.close(); }
    const imported = await producer.newPage(); await imported.goto(`chrome-extension://${extensionId}/review.html`); await imported.locator('input[type=file]').setInputFiles(path);
    await expect(imported.getByRole('heading', { name: exported.title })).toBeVisible();
    await imported.getByRole('button', { name: 'Replay', exact: true }).click();
    await expect(imported.getByRole('region', { name: 'DOM replay' }).getByRole('status')).toHaveText('Replay paused', { timeout: 15_000 });
    await imported.locator('iframe[title="Isolated DOM session replay"]').scrollIntoViewIfNeeded();
    const sandbox = imported.frames().find((frame) => frame.url().startsWith('data:text/html'))!;
    await expect(sandbox.childFrames()[0]!.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await sandbox.childFrames()[0]!.locator('main > div').nth(1).evaluate((element) => ({ display: getComputedStyle(element).display, columns: getComputedStyle(element).gridTemplateColumns, gap: getComputedStyle(element).columnGap }))).toEqual(presentation);
    await expect.poll(() => sandbox.locator('iframe').evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(480);
    expect(await sandbox.evaluate(() => {
      let blocked = false; try { void parent.document.body; } catch { blocked = true; }
      return { blocked, origin: self.origin, scripts: document.querySelector('iframe')?.sandbox.contains('allow-scripts'), runtime: typeof (window as typeof window & { chrome?: { runtime?: unknown } }).chrome?.runtime };
    })).toEqual({ blocked: true, origin: 'null', scripts: false, runtime: 'undefined' });
    await imported.screenshot({ path: 'docs/screenshots/phase3-extension-replay.png' });
  } finally { await producer.close(); }
});

test('new recordings retain safe layout, cascade changes and viewport resizing without CSS secrets', async ({ page }) => {
  const context = await launch();
  try {
    const source = await context.newPage(); await source.setViewportSize({ width: 1440, height: 900 });
    await source.goto('http://127.0.0.1:5174/');
    await source.addStyleTag({ content: '.demo-grid { --CSS_SECRET: 100px; font-family: "FONT_SECRET", sans-serif; background-image: url("data:image/svg+xml,CSS_IMAGE_SECRET"); } .layout-change .demo-grid { grid-template-columns: 1fr; background-color: rgb(1, 2, 3); }' });
    const initial = await source.locator('.demo-grid').evaluate((element) => ({ columns: getComputedStyle(element).gridTemplateColumns, width: element.getBoundingClientRect().width }));
    const review = await start(context, source);
    await source.evaluate(() => document.body.classList.add('layout-change'));
    await source.setViewportSize({ width: 390, height: 900 });
    await source.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    const final = await source.locator('.demo-grid').evaluate((element) => ({ columns: getComputedStyle(element).gridTemplateColumns, width: element.getBoundingClientRect().width }));
    await review.getByRole('button', { name: 'Stop recording', exact: true }).click();
    const report = await reportFrom(review);
    expect(report.formatVersion).toBe(4);
    expect(JSON.stringify(report)).not.toMatch(/CSS_SECRET|FONT_SECRET|CSS_IMAGE_SECRET|SYNTHETIC_|background-image|--CSS/);
    await page.goto('http://127.0.0.1:5173/'); await importReport(page, report);
    await page.getByRole('button', { name: 'Replay', exact: true }).click();
    const region = page.getByRole('region', { name: 'DOM replay' });
    await expect(region.getByRole('status')).toHaveText('Replay paused');
    await page.locator('iframe[title="Isolated DOM session replay"]').scrollIntoViewIfNeeded();
    const sandbox = page.frames().find((frame) => frame.url().startsWith('data:text/html'))!;
    const grid = sandbox.childFrames()[0]!.locator('main > div').nth(1);
    expect(await grid.evaluate((element) => ({ columns: getComputedStyle(element).gridTemplateColumns, width: element.getBoundingClientRect().width }))).toEqual(initial);
    await page.screenshot({ path: 'docs/screenshots/replay-layout-desktop.png' });
    await region.getByLabel('Replay position').focus(); await page.keyboard.press('End');
    await expect.poll(() => grid.evaluate((element) => ({ columns: getComputedStyle(element).gridTemplateColumns, width: element.getBoundingClientRect().width }))).toEqual(final);
    await expect(grid).toHaveCSS('background-color', 'rgb(1, 2, 3)');
    await expect.poll(() => sandbox.childFrames()[0]!.evaluate(() => innerWidth)).toBe(390);
    await page.screenshot({ path: 'docs/screenshots/replay-layout-resized.png' });
  } finally { await context.close(); }
});

test('invalid and hostile imports preserve the open report and its unsaved details', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await importReport(page, fixture);
  await editReportDetails(page);await page.getByLabel('Report title', { exact: true }).fill('Unsaved investigation');
  const invalid: [string, Buffer, RegExp][] = [
    ['broken.json', Buffer.from('{broken'), /not valid JSON/],
    ['unknown.json', Buffer.from(JSON.stringify({ ...fixture, formatVersion: 999 })), /Unsupported report version/],
    ['empty.json', Buffer.from('{}'), /Invalid report structure/],
    ['large.json', Buffer.alloc(5 * 1024 * 1024 + 1), /5 MiB limit/],
  ];
  const hostile = structuredClone(replayFixture());
  if (hostile.evidence.kind !== 'web' || !hostile.evidence.replay) throw new Error('Missing fixture');
  const full = hostile.evidence.replay.find((event) => event.type === 2)!;
  full.data.node = { type: 2, id: 100, tagName: 'div', attributes: { onclick: 'alert(1)' }, childNodes: [] } as typeof full.data.node;
  invalid.push(['hostile.json', Buffer.from(JSON.stringify(hostile)), /Invalid report structure/]);
  for (const [name, buffer, error] of invalid) {
    await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'application/json', buffer });
    await expect(page.getByRole('alert')).toContainText(error);
    await expect(page.getByLabel('Report title', { exact: true })).toHaveValue('Unsaved investigation');
    await expect(page.getByRole('heading', { name: fixture.title, exact: true })).toBeVisible();
  }
  await importReport(page, { ...fixture, title: 'Replacement' });
  await expect(page.getByRole('dialog')).toContainText('Replacing removes the current report');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Report title', { exact: true })).toHaveValue('Unsaved investigation');
  await navigateWorkspace(page, 'Help & privacy');
  await navigateWorkspace(page, 'Reports');
  await expect(page.getByLabel('Report title', { exact: true })).toHaveValue('Unsaved investigation');
  const title = '<img src=x onerror="window.REPORT_EXECUTED=1">';
  await importReport(page, { ...fixture, title });
  await page.getByRole('dialog').getByRole('button', { name: 'Replace report' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeFocused();
  expect(await page.locator('.report-viewer img').count()).toBe(0);
  expect(await page.evaluate(() => 'REPORT_EXECUTED' in window)).toBe(false);
  await page.getByRole('button', { name: 'Remove report', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove report', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove report', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Import report', exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Your investigation starts here' })).toBeVisible();
});

test('cancelling an in-flight read ignores late results and reload clears local evidence', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await importReport(page, fixture);
  await page.evaluate(() => {
    const text = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise<void>((resolve) => { (window as typeof window & { finishReportRead?: () => void }).finishReportRead = resolve; });
      return text.call(this);
    };
  });
  await importReport(page, { ...fixture, title: 'Late result' });
  await expect(page.getByRole('button', { name: 'Cancel import' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel import' }).click();
  await page.evaluate(() => (window as typeof window & { finishReportRead?: () => void }).finishReportRead?.());
  await expect(page.getByRole('status')).toContainText('Import cancelled');
  await expect(page.getByRole('heading', { name: fixture.title, exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your investigation starts here' })).toBeVisible();
});

test('non-web reports, paginated evidence and investigation layouts remain usable by keyboard', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  const manyEvents = { ...fixture, timeline: Array.from({ length: 101 }, (_, index) => ({ atMs: index, kind: 'note', label: `Evidence ${index + 1}` })) };
  await importReport(page, manyEvents);
  await expect(page.locator('.timeline-list li')).toHaveCount(50);
  await page.getByRole('button', { name: 'Next events' }).click();
  await expect(page.locator('.timeline-list li').first()).toContainText('Evidence 51');
  await page.getByLabel('Event type').selectOption('error');
  await expect(page.getByText('No timeline events match this filter.')).toBeVisible();
  await page.getByLabel('Event type').selectOption('all');
  await expect(page.locator('.timeline-list li').first()).toContainText('Evidence 1');
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const pane of ['Timeline', 'Failed requests', 'Context']) {
      await page.getByRole('button', { name: pane, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `docs/screenshots/phase3-investigation-${width}.png`, fullPage: true });
  }
  await importReport(page, { ...fixture, title: 'Manual device report', source: { platform: 'device', method: 'manual' }, environment: { os: 'unknown' }, evidence: { kind: 'none' }, capabilities: { interactions: 'unsupported', replay: 'unsupported', errors: 'unsupported', requests: 'unsupported', environment: 'unavailable', playwright: 'unsupported' } });
  await page.getByRole('dialog').getByRole('button', { name: 'Replace report' }).click();
  await page.getByRole('button', { name: 'Replay', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Replay unavailable' })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Errors', exact: true }).click();
  await expect(page.getByText('Error evidence is unsupported for this report.')).toBeVisible();
});
