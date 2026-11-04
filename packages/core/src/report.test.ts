import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../fixtures/web-report.json';
import { LIMITS, parseReport, ReportValidationError } from './report.js';

const check = (value: unknown) => parseReport(JSON.stringify(value));
const rejects = (value: unknown, code = 'invalid-report') => assert.throws(() => check(value), (error) => error instanceof ReportValidationError && error.code === code);

test('accepts a valid web fixture and non-web report without browser evidence', () => {
  assert.equal(check(fixture).id, fixture.id);
  const value = structuredClone(fixture) as Record<string, unknown>;
  value.source = { platform: 'device', method: 'manual' };
  value.evidence = { kind: 'none' };
  value.environment = { os: 'unknown' };
  value.capabilities = { interactions: 'unsupported', replay: 'unsupported', errors: 'unavailable', requests: 'unsupported', environment: 'available', playwright: 'unsupported' };
  assert.equal(check(value).source.platform, 'device');
});

test('rejects malformed JSON, missing structure and unsupported versions clearly', () => {
  assert.throws(() => parseReport('{'), (e) => e instanceof ReportValidationError && e.code === 'invalid-json');
  for (const value of [null, [], {}, { ...fixture, id: 'no' }, { ...fixture, title: ' ' }]) rejects(value);
  rejects({ ...fixture, formatVersion: 999 }, 'unsupported-version');
  rejects({ ...fixture, formatVersion: '1' }, 'unsupported-version');
});

test('bounds raw bytes including multi-byte text before JSON parsing', () => {
  for (const value of [' '.repeat(LIMITS.bytes + 1), 'é'.repeat(LIMITS.bytes / 2 + 1)]) {
    assert.throws(() => parseReport(value), (e) => e instanceof ReportValidationError && e.code === 'too-large');
  }
});

test('rejects unknown fields, active URLs, credentials and unsanitized URL queries', () => {
  rejects({ ...fixture, cookies: 'secret' });
  rejects({ ...fixture, evidence: { ...fixture.evidence, replay: '<script>evil()</script>' } });
  for (const url of ['javascript:alert(1)', 'https://u:p@example.com/', 'https://example.com/?token=x', 'https://example.com/#secret']) {
    rejects({ ...fixture, evidence: { ...fixture.evidence, page: { url } } });
  }
  rejects({ ...fixture, environment: { ...fixture.environment, localStorage: {} } });
});

test('enforces time, combined count, text bounds and capability consistency', () => {
  rejects({ ...fixture, capture: { ...fixture.capture, endedAt: '2026-11-03T08:59:00.000Z' } });
  rejects({ ...fixture, capture: { ...fixture.capture, endedAt: '2026-11-03T09:06:00.000Z' } });
  rejects({ ...fixture, timeline: [...fixture.timeline].reverse() });
  rejects({ ...fixture, timeline: [{ atMs: 4001, kind: 'note', label: '' }] });
  rejects({ ...fixture, timeline: Array.from({ length: LIMITS.events }, () => fixture.timeline[0]) });
  rejects({ ...fixture, description: 'a'.repeat(10_001) });
  rejects({ ...fixture, capabilities: { ...fixture.capabilities, errors: 'unavailable' } });
  rejects({ ...fixture, capabilities: { ...fixture.capabilities, replay: 'available' } });
  rejects({ ...fixture, source: { platform: 'mobile', method: 'manual' } });
  rejects({ ...fixture, evidence: { ...fixture.evidence, failedRequests: [{ ...fixture.evidence.failedRequests[0], status: 200 }] } });
});

test('hostile content remains inert text; validation errors do not echo unknown keys', () => {
  assert.equal(check({ ...fixture, title: '<img src=x onerror=alert(1)>' }).title, '<img src=x onerror=alert(1)>');
  assert.throws(() => check({ ...fixture, 'SENSITIVE_ATTACKER_KEY': {} }), (e) => e instanceof Error && !e.message.includes('SENSITIVE_ATTACKER_KEY'));
});
