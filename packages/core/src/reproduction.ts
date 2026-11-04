import { parseReport, type Report } from './report.js';
import { CONTROL_ROLES } from './privacy.js';

export const REPRODUCTION_ACTION_LIMIT = 97;
const roles = new Set<string>(CONTROL_ROLES);
const literal = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function generateReproduction(input: Report): { steps: string[]; source: string | null; warnings: string[] } {
  const report = parseReport(JSON.stringify(input));
  if (report.source.platform !== 'web' || report.evidence.kind !== 'web' || !report.evidence.actions.length || report.capabilities.playwright === 'unsupported') {
    return { steps: [], source: null, warnings: ['No compatible captured web actions are available for a Playwright draft.'] };
  }
  const warnings = new Set<string>(['Editable starting point only. Supply authentication, backend state and assertions; none can be inferred from replay.']);
  const actions = report.evidence.actions.filter((action, index, all) => {
    const next = all[index + 1];
    return !(action.type === 'input' && action.locator.kind !== 'unavailable' && next?.type === 'input' && JSON.stringify(action.locator) === JSON.stringify(next.locator) && action.inputKind === next.inputKind && action.target === next.target);
  });
  const pageUrl = report.evidence.page?.url;
  const usableUrl = Boolean(pageUrl && new URL(pageUrl).hostname !== 'redacted.invalid' && !/\[redacted\]|%5bredacted%5d/i.test(new URL(pageUrl).pathname));
  const steps = [usableUrl ? `Open ${pageUrl}. Supply any required login and initial state.` : 'Open the original page. Its exact starting URL was not captured; supply the URL and required setup.'];
  const lines = [
    "import { test } from '@playwright/test';", '',
    '// Editable ReproKit draft. Review before running against a disposable test environment.',
    '// TODO: supply authentication, initial data, services and application-specific waits.',
    '// No credentials, masked values, backend setup or business assertions were inferred.',
    `test(${literal(report.title)}, async ({ page }) => {`,
  ];
  if (usableUrl) lines.push(`  await page.goto(${literal(pageUrl!)});`);
  else {
    warnings.add('The starting URL is missing or redacted. Restore it before running.');
    lines.push('  throw new Error("TODO: restore the original starting URL and replace this line with page.goto(...).");');
  }
  for (const [index, action] of actions.slice(0, REPRODUCTION_ACTION_LIMIT).entries()) {
    const prefix = `${(action.atMs / 1000).toFixed(3)} s: `;
    const locator = action.locator.kind === 'testId' && action.locator.value ? `page.getByTestId(${literal(action.locator.value)})`
      : action.locator.kind === 'role' && roles.has(action.locator.value) ? `page.getByRole(${literal(action.locator.value)})` : null;
    lines.push('', `  // Captured action ${index + 1} at ${action.atMs} ms. Timing is context, not a fixed delay.`);
    if (action.type === 'navigation') {
      steps.push(`${prefix}Navigate to the original destination manually; its URL was not retained.`);
      warnings.add('Navigation destinations are not retained. Restore routes and navigation waits manually.');
      lines.push('  throw new Error("TODO: restore the captured navigation destination; no route was inferred.");');
    } else if (!locator) {
      steps.push(`${prefix}${action.type === 'click' ? 'Click the intended control' : 'Enter the masked value'}; the target needs a stable locator.`);
      warnings.add('Some targets have no supported unique locator. Supply those locators manually.');
      lines.push(`  throw new Error("TODO: supply a stable locator for captured action ${index + 1}.");`);
    } else if (action.type === 'click') {
      steps.push(`${prefix}Click ${action.locator.kind === 'testId' ? 'test ID' : 'role'} ${JSON.stringify(action.locator.value)}.`);
      lines.push(`  await ${locator}.click();`);
    } else if (action.inputKind === 'text' || action.inputKind === 'password') {
      steps.push(`${prefix}Fill ${action.locator.kind === 'testId' ? 'test ID' : 'role'} ${JSON.stringify(action.locator.value)} with a manually supplied value; the original value is masked.`);
      warnings.add('Input values are masked. Replace each throwing value placeholder before running; no value is stored.');
      lines.push(`  const value${index + 1} = (() => { throw new Error("TODO: supply the masked value for action ${index + 1}."); })();`, `  await ${locator}.fill(value${index + 1});`);
    } else {
      steps.push(`${prefix}Restore the original input operation manually; its value, state or control kind is unavailable.`);
      warnings.add('Selection, checkbox/radio state, file uploads and legacy inputs need manual operations.');
      lines.push(`  throw new Error("TODO: restore the input operation for action ${index + 1}; no value or checked state was inferred.");`);
    }
  }
  if (actions.length > REPRODUCTION_ACTION_LIMIT) {
    steps.push(`Restore the remaining ${actions.length - REPRODUCTION_ACTION_LIMIT} actions manually; the draft is limited to ${REPRODUCTION_ACTION_LIMIT} actions.`);
    warnings.add(`Only the first ${REPRODUCTION_ACTION_LIMIT} actions are included. The remaining actions require manual review.`);
    lines.push('', '  throw new Error("TODO: restore remaining actions omitted by the draft limit.");');
  }
  steps.push('Add assertions for the intended result. Captured errors and failed requests are evidence, not inferred expectations.');
  lines.push('', '  // Replace this guard with your own assertions. Completing clicks alone does not prove reproduction.', '  throw new Error("TODO: add assertions for the intended result; no assertions were inferred.");', '});', '');
  return { steps: steps.map((step) => step.length > 1000 ? `${step.slice(0, 997)}...` : step), source: lines.join('\n'), warnings: [...warnings] };
}
