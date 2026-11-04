import { navigateWorkspace, editReportDetails } from './workspace';
import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import fixture from '../packages/core/fixtures/web-report.json' with { type: 'json' };
import { generateReproduction } from '../packages/core/src/report';
import { launch, start, reportFrom } from './extension';

test('a real recording produces an editable download that executes and exposes the deliberate demo bug', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const context = await launch();
  const runDir = testInfo.outputPath('generated-run'); await mkdir(runDir, { recursive: true });
  const configPath = join(runDir, 'playwright.config.mjs');
  const specPath = join(runDir, 'recording.spec.ts');
  await writeFile(configPath, `export default ${JSON.stringify({ testDir: runDir, testMatch: 'recording.spec.ts', timeout: 15_000, workers: 1, reporter: 'json', use: { headless: true, browserName: 'chromium' }, outputDir: join(runDir, 'results') })};`);
  async function execute(source: string) {
    await writeFile(specPath, source);
    let stdout: string;
    try { stdout = (await promisify(execFile)(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', '--config', configPath], { cwd: resolve('.'), timeout: 30_000, maxBuffer: 2 * 1024 * 1024 })).stdout; }
    catch (failure) { stdout = (failure as { stdout?: string }).stdout ?? ''; }
    expect(stdout.trim().startsWith('{'), 'Nested runner must return a real Playwright JSON result').toBe(true);
    return JSON.parse(stdout) as { stats: { expected: number; unexpected: number }; suites: { specs: { tests: { results: { error?: { message?: string } }[] }[] }[] }[] };
  }
  try {
    const source = await context.newPage(); await source.goto('http://127.0.0.1:5174/');
    const review = await start(context, source);
    await source.getByTestId('submit-order').click();
    await expect(source.getByTestId('order-state')).toContainText('Submit attempts: 1');
    await review.getByRole('button', { name: 'Stop recording', exact: true }).click();
    const report = await reportFrom(review);
    expect(report.formatVersion).toBe(4);
    expect(report.capabilities.playwright).toBe('available');
    expect(report.suggestedSteps.some((step) => step.includes('submit-order'))).toBe(true);
    const generated = generateReproduction(report).source!;
    const guarded = await execute(generated);
    expect(guarded.stats.unexpected).toBe(1);
    expect(JSON.stringify(guarded.suites)).toContain('TODO: add assertions');
    await review.getByRole('button', { name: 'Reproduction', exact: true }).click();
    await expect(review.getByLabel('Playwright source')).toHaveValue(generated);
    // These assertions are supplied by this test author from the controlled demo, never by the generator.
    const manual = generated.replace("import { test }", "import { test, expect }").replace('throw new Error("TODO: add assertions for the intended result; no assertions were inferred.");', 'await expect(page.getByTestId("order-state")).toContainText("Order: unsaved");\n  await expect(page.getByTestId("order-state")).toContainText("Submit attempts: 1");');
    await review.getByLabel('Playwright source').fill(manual);
    await review.getByRole('button', { name: 'Timeline', exact: true }).click();
    await review.getByRole('button', { name: 'Reproduction', exact: true }).click();
    await expect(review.getByLabel('Playwright source')).toHaveValue(manual);
    const downloading = review.waitForEvent('download'); await review.getByRole('button', { name: 'Export Playwright test' }).click();
    const download = await downloading; expect(download.suggestedFilename()).toBe(`${report.id}.spec.ts`);
    const downloadedPath = testInfo.outputPath(download.suggestedFilename()); await download.saveAs(downloadedPath);
    expect(await readFile(downloadedPath, 'utf8')).toBe(manual);
    expect((await execute(await readFile(downloadedPath, 'utf8'))).stats).toMatchObject({ expected: 1, unexpected: 0 });
    const intended = await execute(manual.replace('Order: unsaved', 'Order: saved'));
    expect(intended.stats.unexpected).toBe(1);
    expect(JSON.stringify(intended.suites)).toContain('Order: saved');
    await page.goto('http://127.0.0.1:5173/');
    await page.locator('input[type=file]').setInputFiles({ name: 'actual.reprokit.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(report)) });
    await page.getByRole('button', { name: 'Reproduction', exact: true }).click();
    await expect(page.getByLabel('Playwright source')).toHaveValue(generated);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `docs/screenshots/phase4-reproduction-${width}.png`, fullPage: true });
    }
  } finally { await context.close(); }
});

test('capture retains only unique short test IDs or control roles while values, labels and ambiguous targets stay private', async () => {
  const context = await launch();
  try {
    const source = await context.newPage();
    await source.route('http://127.0.0.1:5174/phase4-controls', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Explicit synthetic locator fixture</title><input aria-label="PRIVATE_LABEL" type="text"><input aria-label="Password" data-testid="password-field" type="password"><input aria-label="Checkbox" type="checkbox"><button data-testid="duplicate">Alpha</button><button data-testid="duplicate">Beta</button><button data-testid="private@example.invalid">Invalid ID</button><div data-reprokit-mask><button data-testid="BLOCKED_SECRET">Blocked</button></div>' }));
    await source.goto('http://127.0.0.1:5174/phase4-controls');
    const review = await start(context, source);
    await source.getByLabel('PRIVATE_LABEL').fill('PRIVATE_VALUE');
    await source.getByLabel('Password', { exact: true }).fill('PRIVATE_PASSWORD');
    await source.getByLabel('Checkbox', { exact: true }).check();
    await source.getByRole('button', { name: 'Alpha', exact: true }).click();
    await source.getByRole('button', { name: 'Invalid ID', exact: true }).click();
    await source.getByRole('button', { name: 'Blocked', exact: true }).click();
    await review.getByRole('button', { name: 'Stop recording', exact: true }).click();
    const report = await reportFrom(review);
    expect(JSON.stringify(report)).not.toMatch(/PRIVATE_|BLOCKED_SECRET|private@example/);
    if (report.evidence.kind !== 'web') throw Error('Missing web evidence');
    expect(report.evidence.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'input', inputKind: 'text', locator: { kind: 'role', value: 'textbox' } }),
      expect.objectContaining({ type: 'input', inputKind: 'password', locator: { kind: 'testId', value: 'password-field' } }),
      expect.objectContaining({ type: 'input', inputKind: 'other', locator: { kind: 'role', value: 'checkbox' } }),
      expect.objectContaining({ type: 'click', locator: { kind: 'unavailable', value: '' } }),
    ]));
    expect(generateReproduction(report).source).toContain('TODO: restore the original starting URL');
    expect(generateReproduction(report).warnings.join(' ')).toContain('masked');
  } finally { await context.close(); }
});

test('hostile source stays inert, draft edits survive navigation, and non-web reports have no test export', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  const hostile = { ...fixture, title: '</textarea><img src=x onerror="window.REPROKIT_EXECUTED=1">' };
  await page.locator('input[type=file]').setInputFiles({ name: 'hostile.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(hostile)) });
  await page.getByRole('button', { name: 'Reproduction', exact: true }).click();
  expect(await page.getByLabel('Playwright source').inputValue()).toContain('\\u003c/textarea>');
  const source = 'globalThis.REPROKIT_EXECUTED = true;\n// Edited code is download-only.';
  await page.getByLabel('Playwright source').fill(source);
  await navigateWorkspace(page, 'Help & privacy'); await navigateWorkspace(page, 'Reports');
  await expect(page.getByLabel('Playwright source')).toHaveValue(source);
  expect(await page.evaluate(() => 'REPROKIT_EXECUTED' in window)).toBe(false);
  expect(await page.locator('.report-viewer img').count()).toBe(0);
  await page.getByRole('button', { name: 'Remove report', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Remove report', exact: true }).click();
  const device = { ...fixture, source: { platform: 'device', method: 'manual' }, environment: { os: 'unknown' }, evidence: { kind: 'none' }, capabilities: { interactions: 'unsupported', replay: 'unsupported', errors: 'unsupported', requests: 'unsupported', environment: 'unavailable', playwright: 'unsupported' } };
  await page.locator('input[type=file]').setInputFiles({ name: 'device.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(device)) });
  await page.getByRole('button', { name: 'Reproduction', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reproduction unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Playwright test' })).toHaveCount(0);
});
