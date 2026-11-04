import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../fixtures/web-report.json';
import { LIMITS, parseReport, prepareReportExport, readReportFile, ReportValidationError } from './report.js';

test('portable export/import round-trips and uses only the validated id in its filename', async () => {
  const report = parseReport(JSON.stringify({ ...fixture, title: '<img src=x onerror=alert(1)>' }));
  const exported = prepareReportExport(report);
  assert.equal(exported.filename, `${report.id}.reprokit.json`);
  assert.deepEqual(await readReportFile(new File([exported.text], exported.filename)), report);
  assert.throws(() => prepareReportExport({ ...report, title: '' }));
});

test('oversized files are rejected before reading; cancellation never processes the report', async () => {
  let reads = 0;
  const file = { name: 'x.reprokit.json', size: LIMITS.bytes + 1, text: async () => { reads++; return '{}'; } };
  await assert.rejects(readReportFile(file), (error) => error instanceof ReportValidationError && error.code === 'too-large');
  assert.equal(reads, 0);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(readReportFile({ ...file, size: 1 }, controller.signal), (error) => error instanceof DOMException && error.name === 'AbortError');
  assert.equal(reads, 0);
  const during = new AbortController();
  await assert.rejects(readReportFile({ name: 'x.json', size: 1, text: async () => { during.abort(); return 'not JSON'; } }, during.signal), (error) => error instanceof DOMException && error.name === 'AbortError');
});

test('invalid structure and versions fail with useful errors without echoing report content', async () => {
  for (const text of ['not JSON', '{}', JSON.stringify({ ...fixture, formatVersion: 999 })]) {
    await assert.rejects(readReportFile(new File([text], 'x.json')), (error) => error instanceof ReportValidationError);
  }
  await assert.rejects(readReportFile(new File(['{}'], 'x.html')), /Choose a/);
});

test('replay imports reject active nodes/attributes and aggregate DOM traversal overflow', () => {
  const started = Date.parse(fixture.capture.startedAt);
  const base = { ...fixture, formatVersion: 2, capabilities: { ...fixture.capabilities, replay: 'available' } };
  const textNode = { type: 3, id: 2, textContent: '[masked]' };
  const full = (node: unknown) => ({ type: 2, timestamp: started, data: { node, initialOffset: { left: 0, top: 0 } } });
  const check = (node: unknown) => parseReport(JSON.stringify({ ...base, evidence: { ...fixture.evidence, replay: [full(node)] } }));
  for (const tagName of ['script', 'iframe', 'img', 'style', 'object', 'embed', 'svg']) {
    assert.throws(() => check({ type: 2, id: 1, tagName, attributes: {}, childNodes: [] }));
  }
  for (const attributes of [{ onclick: 'alert(1)' }, { src: 'https://example.com/tracker' }, { style: 'background:url(https://example.com)' }, { href: 'javascript:alert(1)' }]) {
    assert.throws(() => check({ type: 2, id: 1, tagName: 'a', attributes, childNodes: [] }));
  }
  const children = Array.from({ length: 2_500 }, (_, index) => ({ ...textNode, id: index + 3 }));
  assert.throws(() => check({ type: 0, id: 0, childNodes: [0, 1].map((id) => ({ type: 2, id: id + 1, tagName: 'div', attributes: {}, childNodes: children })) }));
  assert.throws(() => parseReport(JSON.stringify({ ...base, evidence: { ...fixture.evidence, replay: [{ type: 4, timestamp: started, data: { href: 'https://example.com/', width: 1e15, height: 600 } }] } })));
});
