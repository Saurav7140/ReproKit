import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import type { record } from '@rrweb/record';

// Synthetic, test-only API spike. No application imports or enables this recorder.
test('rrweb supports input/text/region masking but still needs attribute and URL sanitation', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/');
  await page.setContent('<p>SYNTHETIC_ORDINARY_TEXT</p><input value="SYNTHETIC_INPUT"><textarea>SYNTHETIC_TEXTAREA</textarea><div contenteditable>SYNTHETIC_EDITABLE</div><div data-reprokit-mask>SYNTHETIC_REGION</div><a href="/customer/SYNTHETIC_PATH?token=SYNTHETIC_QUERY" data-private="SYNTHETIC_ATTRIBUTE">link</a>');
  await page.addScriptTag({ path: resolve('node_modules/@rrweb/record/dist/record.umd.cjs') });
  const result = await page.evaluate(async () => {
    const api = window as typeof window & { rrwebRecord: { record: typeof record } };
    const events: unknown[] = [];
    const stop = api.rrwebRecord.record({
      emit: (event) => events.push(event), maskAllInputs: true, maskTextSelector: '*',
      blockSelector: '[data-reprokit-mask], [contenteditable]', maskInputFn: () => '[masked]', maskTextFn: () => '[masked]',
      inlineStylesheet: false, inlineImages: false, recordCanvas: false, collectFonts: false, recordCrossOriginIframes: false,
    });
    const input = document.querySelector('input')!;
    input.value = 'SYNTHETIC_MUTATED_INPUT';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const text = document.createElement('p');
    text.textContent = 'SYNTHETIC_MUTATED_TEXT';
    document.body.append(text);
    await new Promise((done) => setTimeout(done, 50));
    stop?.();
    const stoppedAt = events.length;
    document.body.append(document.createElement('div'));
    await new Promise((done) => setTimeout(done, 50));
    return { serialized: JSON.stringify(events), eventCount: events.length, stoppedAt, hasStop: typeof stop === 'function' };
  });
  expect(result.hasStop).toBe(true);
  expect(result.eventCount).toBeGreaterThanOrEqual(2);
  expect(result.eventCount).toBe(result.stoppedAt);
  for (const secret of ['SYNTHETIC_ORDINARY_TEXT', 'SYNTHETIC_INPUT', 'SYNTHETIC_TEXTAREA', 'SYNTHETIC_EDITABLE', 'SYNTHETIC_REGION', 'SYNTHETIC_MUTATED_INPUT', 'SYNTHETIC_MUTATED_TEXT']) expect(result.serialized).not.toContain(secret);
  // Expected gap: never treat rrweb masking options as a complete privacy boundary.
  expect(result.serialized).toContain('SYNTHETIC_ATTRIBUTE');
  expect(result.serialized).toContain('SYNTHETIC_QUERY');
});
