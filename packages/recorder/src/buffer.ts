import { LIMITS, REPORT_VERSION, generateReproduction, parseReport, type Report } from '@reprokit/core';
import { CONTROL_ROLES, TEST_ID_PATTERN, SAFE_TAGS, sanitizeReplayEvent, sanitizeUrl } from '@reprokit/core/privacy';
import { CAPTURE_LIMITATIONS, packetSchema, type EndReason } from './protocol';

const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;

export class CaptureBuffer {
  readonly report: Report;
  byteSize: number;
  eventCount = 1;
  private latestMs = 0;
  private finished = false;

  constructor(readonly startedAt = Date.now(), id = crypto.randomUUID(), method: 'chromium-extension' | 'website-sdk' = 'chromium-extension') {
    this.report = {
      formatVersion: REPORT_VERSION, id, source: { platform: 'web', method },
      title: 'Untitled recording', description: '',
      capture: { startedAt: new Date(startedAt).toISOString(), endedAt: new Date(startedAt).toISOString() },
      environment: { os: 'unknown' },
      capabilities: { interactions: 'available', replay: 'unavailable', errors: 'available', requests: 'available', environment: 'available', playwright: 'unavailable' },
      timeline: [{ atMs: 0, kind: 'capture-start', label: method==='website-sdk'?'Explicit consented website recording started':'Explicit selected-tab recording started' }],
      evidence: { kind: 'web', actions: [], errors: [], failedRequests: [], replay: [] },
      suggestedSteps: [], limitations: [...CAPTURE_LIMITATIONS],
    };
    this.byteSize = bytes(this.report);
  }

  append(raw: unknown): EndReason | null {
    if (this.finished) return 'stopped';
    if (Date.now() - this.startedAt >= LIMITS.durationMs) return 'duration-limit';
    const input = raw as { kind?: string; event?: unknown } | null;
    let normalized: unknown = raw;
    if (input?.kind === 'replay') {
      try {
        const clean = sanitizeReplayEvent(input.event);
        if (!clean) return 'invalid-message';
        normalized = { kind: 'replay', event: clean };
      } catch { return 'invalid-message'; }
    }
    const parsed = packetSchema.safeParse(normalized);
    if (!parsed.success) return 'invalid-message';
    const packet = parsed.data;
    if (packet.kind === 'error') {
      packet.event.message = packet.event.type === 'exception' ? 'JavaScript exception (message masked)' : 'Unhandled promise rejection (reason masked)';
      if (packet.event.stack) packet.event.stack = packet.event.stack.match(/^at \[masked\]:\d{1,7}:\d{1,7}$/)?.[0] ?? 'at [masked]';
    } else if (packet.kind === 'action') {
      packet.event.target = (SAFE_TAGS as readonly string[]).includes(packet.event.target) ? packet.event.target : 'element';
      if (!(packet.event.locator.kind === 'testId' && TEST_ID_PATTERN.test(packet.event.locator.value)) && !(packet.event.locator.kind === 'role' && (CONTROL_ROLES as readonly string[]).includes(packet.event.locator.value))) packet.event.locator = { kind: 'unavailable', value: '' };
      packet.event.valueMasked = true;
    } else if (packet.kind === 'request') packet.event.url = sanitizeUrl(packet.event.url);
    const evidence = this.report.evidence;
    if (evidence.kind !== 'web') return 'invalid-message';
    const atMs = packet.kind === 'replay' ? packet.event.timestamp - this.startedAt : packet.event.atMs;
    if (atMs < 0 || atMs > LIMITS.durationMs) return 'invalid-message';
    const timeline: Report['timeline'][number] | null = packet.kind === 'replay' ? null : {
      atMs, kind: packet.kind === 'action' ? 'interaction' : packet.kind,
      label: packet.kind === 'action' ? `${packet.event.type} ${packet.event.target}` : packet.kind === 'error' ? packet.event.message : `${packet.event.transport} HTTP ${packet.event.status} (method unavailable)`,
    };
    const count = 1 + (timeline ? 1 : 0);
    if (this.eventCount + count + 1 > LIMITS.events) return 'event-limit';
    const addition = bytes(packet.event) + 1 + (timeline ? bytes(timeline) + 1 : 0);
    // Reserve bounded generated steps, final metadata and ready metadata before accepting a packet.
    if (this.byteSize + addition + 64 * 1024 > LIMITS.bytes) return 'byte-limit';
    if ((packet.kind === 'error' && evidence.errors.length >= 1_000) || (packet.kind === 'request' && evidence.failedRequests.length >= 1_000)) return 'evidence-limit';
    switch (packet.kind) {
      case 'replay': evidence.replay!.push(packet.event); if (packet.event.type === 2) this.report.capabilities.replay = 'available'; break;
      case 'action': evidence.actions.push(packet.event); break;
      case 'error': evidence.errors.push(packet.event); break;
      case 'request': evidence.failedRequests.push(packet.event); break;
    }
    if (timeline) this.report.timeline.push(timeline);
    this.latestMs = Math.max(this.latestMs, atMs);
    this.byteSize += addition;
    this.eventCount += count;
    return null;
  }

  finish(reason: EndReason): Report {
    if (this.finished) return this.report;
    this.finished = true;
    const elapsed = Math.min(LIMITS.durationMs, Math.max(this.latestMs, Date.now() - this.startedAt, 0));
    this.report.capture.endedAt = new Date(this.startedAt + elapsed).toISOString();
    this.report.timeline.push({ atMs: elapsed, kind: 'capture-stop', label: `Recording ended: ${reason}` });
    this.report.timeline.sort((a, b) => a.atMs - b.atMs);
    if (this.report.evidence.kind === 'web') {
      for (const stream of [this.report.evidence.actions, this.report.evidence.errors, this.report.evidence.failedRequests]) stream.sort((a, b) => a.atMs - b.atMs);
      this.report.evidence.replay?.sort((a, b) => a.timestamp - b.timestamp);
    }
    const draft = generateReproduction(this.report);
    this.report.suggestedSteps = draft.steps;
    if (draft.source) this.report.capabilities.playwright = 'available';
    const validated = parseReport(JSON.stringify(this.report));
    this.byteSize = bytes(validated);
    this.eventCount++;
    return validated;
  }
}
