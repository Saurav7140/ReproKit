import test from 'node:test';
import assert from 'node:assert/strict';
import { Script, createContext } from 'node:vm';
import fixture from '../fixtures/web-report.json';
import { generateReproduction, REPRODUCTION_ACTION_LIMIT, parseReport, type Report } from './report.js';

type Action = Extract<Report['evidence'], { kind: 'web' }>['actions'][number];
const click: Action = { atMs: 1000, type: 'click', target: 'button', locator: { kind: 'testId', value: 'submit-order' }, valueMasked: true };
const report = (actions: Action[] = [click]) => parseReport(JSON.stringify({ ...fixture, formatVersion: 4, evidence: { ...fixture.evidence, actions } }));

test('steps and source are deterministic, retain order and do not invent waits or assertions', () => {
  const draft = generateReproduction(report());
  assert.deepEqual(generateReproduction(report()), draft);
  assert.match(draft.source!, /getByTestId\("submit-order"\)\.click\(\)/);
  assert.match(draft.source!, /TODO: add assertions/);
  assert.doesNotMatch(draft.source!, /waitForTimeout|expect\(|storageState|SYNTHETIC_/);
  assert.equal(draft.steps.length, 3);
  assert.match(draft.steps[1]!, /1\.000 s.*submit-order/);
});

test('hostile titles and selector strings remain JavaScript data, including control characters', async () => {
  const hostile = '"\\\n); globalThis.INJECTED = true; // </script>\u2028\u2029` ${bad}';
  const value = report([{ ...click, locator: { kind: 'testId', value: hostile } }]); value.title = hostile;
  const source = generateReproduction(value).source!;
  let title = '';
  let locator = '';
  let body: ((input: { page: unknown }) => Promise<void>) | undefined;
  const context = createContext({ test: (value: string, callback: typeof body) => { title = value; body = callback; } });
  new Script(source.replace("import { test } from '@playwright/test';", '')).runInContext(context, { timeout: 1000 });
  await assert.rejects(body!({ page: { goto: async () => {}, getByTestId: (value: string) => { locator = value; return { click: async () => {} }; } } }), /TODO: add assertions/);
  assert.equal(title, hostile);
  assert.equal(locator, hostile);
  assert.equal('INJECTED' in context, false);
  assert.equal(source.includes('</script>'), false);
  assert.match(source, /\\u2028/);
});

test('redacted/missing routes, unknown locators and unsupported inputs stop with explicit TODO guards', () => {
  const actions: Action[] = [
    { ...click, locator: { kind: 'unavailable', value: '' } },
    { ...click, atMs: 1100, type: 'navigation' },
    { ...click, atMs: 1200, type: 'input', inputKind: 'other' },
    { ...click, atMs: 1300, locator: { kind: 'role', value: 'button");globalThis.INJECTED=1' } },
  ];
  for (const url of ['https://example.com/[redacted]', 'https://example.com/%5bredacted%5d', 'https://redacted.invalid/']) {
    const value = report(actions); if (value.evidence.kind === 'web') value.evidence.page = { url };
    const draft = generateReproduction(value);
    assert.match(draft.source!, /restore the original starting URL/);
    assert.doesNotMatch(draft.source!, /await page\.goto|globalThis.INJECTED|\.check\(|selectOption|\.first\(/);
    assert.ok(draft.warnings.some((warning) => warning.includes('Navigation')));
    assert.match(draft.source!, /restore the input operation/);
  }
});

test('masked text/password values use throwing placeholders; only consecutive same-target input is coalesced', () => {
  const input: Action = { ...click, type: 'input', inputKind: 'password', locator: { kind: 'testId', value: 'password-field' } };
  const draft = generateReproduction(report([input, { ...input, atMs: 1100 }, { ...click, atMs: 1200 }, { ...input, atMs: 1300 }]));
  assert.equal((draft.source!.match(/\.fill\(/g) ?? []).length, 2);
  assert.match(draft.source!, /1100 ms/);
  assert.doesNotMatch(draft.source!, /1000 ms/);
  assert.match(draft.source!, /throw new Error\("TODO: supply the masked value/);
  const role = generateReproduction(report([{ ...input, locator: { kind: 'role', value: 'textbox' }, inputKind: 'text' }]));
  assert.match(role.source!, /getByRole\("textbox"\)\.fill/);
  const legacy = parseReport(JSON.stringify({ ...fixture, evidence: { ...fixture.evidence, actions: [{ ...click, type: 'input' }] } }));
  assert.match(generateReproduction(legacy).source!, /restore the input operation/);
});

test('large drafts have explicit truncation and bounded steps; unavailable evidence stays unavailable', () => {
  const draft = generateReproduction(report(Array.from({ length: 105 }, (_, index) => ({ ...click, atMs: index }))));
  assert.equal((draft.source!.match(/\.click\(/g) ?? []).length, REPRODUCTION_ACTION_LIMIT);
  assert.equal(draft.steps.length, 100);
  assert.ok(draft.steps.every((step) => step.length <= 1000));
  assert.match(draft.source!, /remaining actions omitted/);
  assert.equal(generateReproduction(report([])).source, null);
  const unsupported = report(); unsupported.capabilities.playwright = 'unsupported';
  assert.equal(generateReproduction(unsupported).source, null);
  const nonweb = parseReport(JSON.stringify({ ...fixture, source: { platform: 'device', method: 'manual' }, evidence: { kind: 'none' }, environment: { os: 'unknown' }, capabilities: { interactions: 'unsupported', replay: 'unsupported', errors: 'unsupported', requests: 'unsupported', environment: 'available', playwright: 'unsupported' } }));
  assert.equal(generateReproduction(nonweb).source, null);
  assert.throws(() => generateReproduction({ ...report(), formatVersion: 999 } as unknown as Report));
});

test('v4 metadata/capabilities are explicit while older reports remain supported', () => {
  const value = report([{ ...click, type: 'input', inputKind: 'text' }]); value.capabilities.playwright = 'available';
  assert.equal(parseReport(JSON.stringify(value)).formatVersion, 4);
  assert.throws(() => parseReport(JSON.stringify({ ...value, formatVersion: 3 })));
  assert.throws(() => parseReport(JSON.stringify({ ...value, evidence: { ...fixture.evidence, actions: [{ ...click, inputKind: 'text' }] } })));
  assert.equal(generateReproduction(parseReport(JSON.stringify(fixture))).source !== null, true);
});
