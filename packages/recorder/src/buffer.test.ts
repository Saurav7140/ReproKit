import test from 'node:test';
import assert from 'node:assert/strict';
import { CaptureBuffer } from './buffer.js';
import { LIMITS, parseReport } from '@reprokit/core';

test('capture buffer validates events, orders evidence, and produces a bounded report', () => {
  const buffer = new CaptureBuffer();
  assert.equal(buffer.append({ kind: 'replay', event: { type: 2, timestamp: buffer.startedAt, data: { node: { type: 0, id: 1, childNodes: [] }, initialOffset: { left: 0, top: 0 } } } }), null);
  assert.equal(buffer.append({ kind: 'error', event: { atMs: 0, type: 'exception', message: 'JavaScript exception (message masked)' } }), null);
  const report = buffer.finish('stopped');
  assert.equal(report.capabilities.replay, 'available');
  assert.equal(parseReport(JSON.stringify(report)).source.platform, 'web');
  assert.ok(buffer.byteSize < LIMITS.bytes);
  assert.equal(buffer.append({}), 'stopped');
});

test('combined event and per-channel limits stop before accepting excess evidence', () => {
  const buffer = new CaptureBuffer();
  const packet = { kind: 'replay', event: { type: 0, timestamp: buffer.startedAt, data: {} } };
  for (let i = 0; i < LIMITS.events - 2; i++) assert.equal(buffer.append(packet), null);
  assert.equal(buffer.append(packet), 'event-limit');
  assert.equal(buffer.finish('event-limit').timeline.at(-1)?.kind, 'capture-stop');
  const errors = new CaptureBuffer();
  const error = { kind: 'error', event: { atMs: 0, type: 'exception', message: 'masked' } };
  for (let i = 0; i < 1_000; i++) assert.equal(errors.append(error), null);
  assert.equal(errors.append(error), 'evidence-limit');
});

test('byte, duration and hostile-input limits fail closed', () => {
  const buffer = new CaptureBuffer();
  const node = { type: 0, id: 1, childNodes: Array.from({ length: 4_999 }, (_, i) => ({ type: 3, id: i + 2, textContent: 'masked' })) };
  const packet = { kind: 'replay', event: { type: 2, timestamp: buffer.startedAt, data: { node, initialOffset: { left: 0, top: 0 } } } };
  let result = buffer.append(packet);
  for (let i = 0; !result && i < 50; i++) result = buffer.append(packet);
  assert.equal(result, 'byte-limit');
  assert.ok(JSON.stringify(buffer.finish('byte-limit')).length <= LIMITS.bytes);
  assert.equal(new CaptureBuffer(Date.now() - LIMITS.durationMs - 1).append(packet), 'duration-limit');
  assert.equal(new CaptureBuffer().append({ kind: 'cookie', event: { SECRET: true } }), 'invalid-message');
});
