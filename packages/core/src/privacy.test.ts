import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeReplayEvent, sanitizeUrl } from './privacy.js';
import { replayEventSchema } from './replay.js';
import { parseReport, ReportValidationError } from './report.js';
import fixture from '../fixtures/web-report.json';

test('URLs redact path segments, credentials, queries and fragments', () => {
  assert.equal(sanitizeUrl('https://user:secret@example.com/customer/SENSITIVE?token=SECRET#PRIVATE'), 'https://example.com/[redacted]');
  for (const value of ['file:///C:/secret', 'javascript:alert(1)', null, 'x'.repeat(8193)]) assert.equal(sanitizeUrl(value), 'https://redacted.invalid/');
});

test('snapshot and mutation allowlists remove arbitrary secrets and active assets', () => {
  const node = { type: 2, id: 1, tagName: 'button', attributes: { onclick: 'SECRET', style: 'url(SECRET)', id: 'SECRET', 'data-testid': 'SECRET', title: 'SECRET', type: 'submit' }, childNodes: [{ type: 3, id: 2, textContent: 'SECRET' }, { type: 2, id: 3, tagName: 'script', attributes: { src: 'SECRET' }, childNodes: [{ type: 3, id: 4, textContent: 'SECRET' }] }] };
  const snapshot = sanitizeReplayEvent({ type: 2, timestamp: 1, data: { node, initialOffset: { left: 0, top: 0 } }, SECRET: true });
  assert.equal(JSON.stringify(snapshot).includes('SECRET'), false);
  assert.equal(replayEventSchema.safeParse(snapshot).success, true);
  const mutation = sanitizeReplayEvent({ type: 3, timestamp: 2, data: { source: 0, texts: [{ id: 2, value: 'SECRET' }], attributes: [{ id: 1, attributes: { value: 'SECRET', href: 'SECRET' } }], adds: [{ parentId: 1, nextId: null, node }], removes: [] } });
  assert.equal(JSON.stringify(mutation).includes('SECRET'), false);
  assert.equal(replayEventSchema.safeParse(mutation).success, true);
  const focus = sanitizeReplayEvent({ type: 3, timestamp: 3, data: { source: 2, type: 5, id: 1 } });
  assert.equal(replayEventSchema.safeParse(focus).success, true);
  assert.equal(sanitizeReplayEvent({ type: 3, timestamp: 2, data: { source: 8, rules: ['SECRET'] } }), null);
  assert.deepEqual(sanitizeReplayEvent({ type: 3, timestamp: 3, data: { source: 5, id: 1, text: 'SECRET', isChecked: true } }), { type: 3, timestamp: 3, data: { source: 5, id: 1, text: '[masked]', isChecked: false } });
});

test('rejects malformed and deeply nested events without forwarding unknown content', () => {
  assert.throws(() => sanitizeReplayEvent({ type: 2, timestamp: 1, data: { node: {}, initialOffset: {} } }));
  let node: unknown = { type: 3, id: 1, textContent: 'SECRET' };
  for (let i = 0; i < 70; i++) node = { type: 2, id: i + 2, tagName: 'div', attributes: {}, childNodes: [node] };
  assert.throws(() => sanitizeReplayEvent({ type: 2, timestamp: 1, data: { node, initialOffset: { left: 0, top: 0 } } }));
  assert.throws(() => parseReport(JSON.stringify({ ...fixture, hostile: node })), (e) => e instanceof ReportValidationError);
});

test('v1 remains valid and v2 adds strictly sanitized DOM evidence', () => {
  assert.equal(parseReport(JSON.stringify(fixture)).formatVersion, 1);
  const event = sanitizeReplayEvent({ type: 2, timestamp: Date.parse(fixture.capture.startedAt), data: { node: { type: 0, id: 1, childNodes: [] }, initialOffset: { left: 0, top: 0 } } });
  const value = { ...fixture, formatVersion: 2, capabilities: { ...fixture.capabilities, replay: 'available' }, evidence: { ...fixture.evidence, replay: [event] } };
  assert.equal(parseReport(JSON.stringify(value)).capabilities.replay, 'available');
  assert.throws(() => parseReport(JSON.stringify({ ...value, formatVersion: 1 })));
  assert.throws(() => parseReport(JSON.stringify({ ...value, evidence: { ...value.evidence, replay: [{ ...event, extra: 'SECRET' }] } })));
});
