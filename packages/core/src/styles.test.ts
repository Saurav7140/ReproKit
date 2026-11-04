import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeStyle, STYLE_LIMIT } from './styles.js';
import { sanitizeReplayEvent } from './privacy.js';
import { parseReport } from './report.js';
import fixture from '../fixtures/web-report.json';

test('safe resolved presentation round-trips only in v3; active or arbitrary CSS cannot enter replay', () => {
  const style = 'display:grid;grid-template-columns:500px 500px;column-gap:24px;color:rgb(19, 20, 22);font-family:sans-serif';
  assert.equal(sanitizeStyle(style), style);
  for (const unsafe of ['background-image:url(https://example.com/SECRET)', 'content:"SECRET"', '--SECRET:123px', 'font-family:SECRET', 'width:var(--SECRET)', 'width:expression(alert(1))', 'color:rgb(1, 2, 3)/*SECRET*/', 'cursor:url(data:text/html,SECRET)', 'display:gri\\64', 'constructor:SECRET', 'width:1e99px', 'x'.repeat(STYLE_LIMIT + 1)]) assert.equal(sanitizeStyle(unsafe), '');
  assert.equal(sanitizeStyle(`display: block;content:"SECRET";padding-top:12px`), 'display:block;padding-top:12px');
  const event = sanitizeReplayEvent({ type: 2, timestamp: Date.parse(fixture.capture.startedAt), data: { node: { type: 2, id: 1, tagName: 'div', attributes: { style }, childNodes: [] }, initialOffset: { left: 0, top: 0 } } });
  const value = { ...fixture, formatVersion: 3, capabilities: { ...fixture.capabilities, replay: 'available' }, evidence: { ...fixture.evidence, replay: [event] } };
  assert.equal(parseReport(JSON.stringify(value)).formatVersion, 3);
  assert.throws(() => parseReport(JSON.stringify({ ...value, formatVersion: 2 })), /version 3/);
  for (const unsafe of ['background-image:url(https://example.com/SECRET)', 'color:red', `${style};content:"SECRET"`]) {
    assert.throws(() => parseReport(JSON.stringify({ ...value, evidence: { ...value.evidence, replay: [{ ...event, data: { node: { type: 2, id: 1, tagName: 'div', attributes: { style: unsafe }, childNodes: [] }, initialOffset: { left: 0, top: 0 } } }] } })));
  }
});
