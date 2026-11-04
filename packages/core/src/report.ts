import { z } from 'zod';
import { replayEventSchema } from './replay.js';
export { replayEventSchema, type ReplayEvent } from './replay.js';
export { sanitizeUrl, sanitizeReplayEvent, MASK, REPLAY_LIMITS } from './privacy.js';
export { readReportFile, prepareReportExport } from './portable.js';
export { generateReproduction, REPRODUCTION_ACTION_LIMIT } from './reproduction.js';
export { hostedConfiguration, projectNameSchema, projectSchema, reportStatusSchema, hostedReportSchema, dashboardReportUrl, readReportLink, PROJECT_FIELDS, REPORT_FIELDS, type Project, type HostedReport } from './hosted.js';
export { websiteIntakeSchema,websiteOrigin } from './hosted.js';

export const REPORT_VERSION = 4;
export const LIMITS = Object.freeze({ durationMs: 300_000, events: 10_000, bytes: 5 * 1024 * 1024 });

const shortText = z.string().max(500);
const diagnostic = z.string().max(8_000);
const atMs = z.number().int().min(0).max(LIMITS.durationMs);
const safeUrl = z.string().max(2_048).refine((value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}, 'Expected an HTTP(S) URL without credentials, query, or fragment');
const availability = z.enum(['available', 'unavailable', 'unsupported']);
const sourceSchema = z.discriminatedUnion('platform', [
  z.strictObject({ platform: z.literal('web'), method: z.enum(['chromium-extension', 'website-sdk', 'manual']) }),
  z.strictObject({ platform: z.enum(['desktop', 'mobile', 'device']), method: z.literal('manual') }),
]);
export const actionSchema = z.strictObject({
  atMs, type: z.enum(['click', 'input', 'navigation']), target: shortText,
  locator: z.strictObject({ kind: z.enum(['testId', 'role', 'unavailable']), value: shortText }),
  valueMasked: z.boolean(),
  inputKind: z.enum(['text', 'password', 'other']).optional(),
});
export const errorSchema = z.strictObject({
  atMs, type: z.enum(['exception', 'unhandled-rejection']), message: diagnostic, stack: diagnostic.optional(),
});
export const requestSchema = z.strictObject({
  atMs, transport: z.enum(['fetch', 'xhr']), method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'OTHER']),
  url: safeUrl, status: z.number().int().min(0).max(599),
  outcome: z.enum(['http-error', 'network-error', 'aborted', 'timeout']),
}).refine((request) => request.outcome !== 'http-error' || request.status >= 400, 'HTTP failures need status >= 400');
const webEvidence = z.strictObject({
  kind: z.literal('web'),
  page: z.strictObject({ url: safeUrl }).optional(),
  actions: z.array(actionSchema).max(LIMITS.events),
  errors: z.array(errorSchema).max(1_000),
  failedRequests: z.array(requestSchema).max(1_000),
  replay: z.array(replayEventSchema).max(LIMITS.events).optional(),
});

export const reportSchema = z.strictObject({
  formatVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(REPORT_VERSION)]),
  id: z.uuid(),
  source: sourceSchema,
  title: z.string().trim().min(1).max(160),
  description: z.string().max(10_000),
  capture: z.strictObject({ startedAt: z.iso.datetime(), endedAt: z.iso.datetime() }),
  environment: z.strictObject({
    os: z.enum(['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'unknown']),
    browser: z.strictObject({ family: z.enum(['Chromium', 'Firefox', 'WebKit', 'unknown']), majorVersion: z.number().int().min(1).max(999) }).optional(),
    viewport: z.strictObject({ width: z.number().int().min(1).max(16_384), height: z.number().int().min(1).max(16_384) }).optional(),
  }),
  capabilities: z.strictObject({
    interactions: availability, replay: availability, errors: availability, requests: availability,
    environment: availability, playwright: availability,
  }),
  timeline: z.array(z.strictObject({
    atMs, kind: z.enum(['capture-start', 'interaction', 'error', 'request', 'capture-stop', 'note']), label: shortText,
  })).max(LIMITS.events),
  evidence: z.discriminatedUnion('kind', [webEvidence, z.strictObject({ kind: z.literal('none') })]),
  suggestedSteps: z.array(z.string().min(1).max(1_000)).max(100),
  limitations: z.array(z.string().min(1).max(1_000)).min(1).max(100),
}).superRefine((report, context) => {
  const duration = Date.parse(report.capture.endedAt) - Date.parse(report.capture.startedAt);
  const issue = (message: string) => context.addIssue({ code: 'custom', message });
  if (duration < 0 || duration > LIMITS.durationMs) issue('Capture duration must be between 0 and 300000 ms');
  if (report.source.platform !== 'web' && report.evidence.kind !== 'none') issue('Web evidence requires a web source');
  if (report.source.platform !== 'web' && (report.environment.browser || report.environment.viewport)) issue('Browser environment requires a web source');
  if (report.capabilities.playwright === 'available' && (report.formatVersion < 4 || report.source.platform !== 'web' || report.evidence.kind !== 'web' || !report.evidence.actions.length)) issue('Playwright drafts require v4 web action evidence');
  if (report.evidence.kind === 'web' && report.evidence.actions.some((action) => action.inputKind !== undefined && (report.formatVersion < 4 || action.type !== 'input'))) issue('Input control metadata requires a v4 input action');
  const streams: { atMs: number }[][] = [report.timeline];
  if (report.evidence.kind === 'web') streams.push(report.evidence.actions, report.evidence.errors, report.evidence.failedRequests);
  if (report.evidence.kind === 'web' && report.evidence.replay) {
    if (report.formatVersion === 1) issue('Replay requires report version 2 or later');
    if (report.formatVersion < 3) {
      for (const event of report.evidence.replay) {
        if (event.type === 3 && event.data.source === 0 && event.data.attributes.some((entry) => entry.attributes.style !== undefined)) issue('Replay presentation requires report version 3');
        const nodes = event.type === 2 ? [event.data.node] : event.type === 3 && event.data.source === 0 ? event.data.adds.map((entry) => entry.node) : [];
        while (nodes.length) {
          const node = nodes.pop()!;
          if (node.attributes?.style !== undefined) { issue('Replay presentation requires report version 3'); break; }
          nodes.push(...node.childNodes ?? []);
        }
      }
    }
    streams.push(report.evidence.replay.map((event) => ({ atMs: event.timestamp - Date.parse(report.capture.startedAt) })));
    const fullSnapshot = report.evidence.replay.some((event) => event.type === 2);
    if (fullSnapshot !== (report.capabilities.replay === 'available')) issue('Replay availability must match a captured full snapshot');
  } else if (report.capabilities.replay === 'available') issue('Replay availability requires captured replay evidence');
  for (const stream of streams) {
    let previous = -1;
    for (const event of stream) {
      if (event.atMs < previous || event.atMs > duration) { issue('Events must be ordered and within capture duration'); break; }
      previous = event.atMs;
    }
  }
  if (streams.reduce((count, stream) => count + stream.length, 0) > LIMITS.events) issue('Combined event limit exceeded');
  for (const key of ['interactions', 'errors', 'requests'] as const) {
    const records = report.evidence.kind === 'web'
      ? report.evidence[key === 'interactions' ? 'actions' : key === 'requests' ? 'failedRequests' : 'errors'] : [];
    if (report.evidence.kind === 'none' && report.capabilities[key] === 'available') issue(`${key} requires web evidence in v1`);
    if (records.length && report.capabilities[key] !== 'available') issue(`${key} evidence requires an available capability`);
  }
});

export type Report = z.infer<typeof reportSchema>;
export type ValidationCode = 'too-large' | 'invalid-json' | 'unsupported-version' | 'invalid-report';

export class ReportValidationError extends Error {
  constructor(public readonly code: ValidationCode, message: string) { super(message); this.name = 'ReportValidationError'; }
}

/** Validates structure only; callers must sanitize at capture time. */
export function parseReport(json: string): Report {
  if (json.length > LIMITS.bytes || new TextEncoder().encode(json).byteLength > LIMITS.bytes) {
    throw new ReportValidationError('too-large', 'Report exceeds the 5 MiB limit.');
  }
  let value: unknown;
  try { value = JSON.parse(json); }
  catch { throw new ReportValidationError('invalid-json', 'Report is not valid JSON.'); }
  if (value && typeof value === 'object' && 'formatVersion' in value && value.formatVersion !== 1 && value.formatVersion !== 2 && value.formatVersion !== 3 && value.formatVersion !== REPORT_VERSION) {
    throw new ReportValidationError('unsupported-version', 'Unsupported report version. This build supports versions 1, 2, 3 and 4.');
  }
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  while (pending.length) {
    const entry = pending.pop()!;
    if (entry.depth > 80) throw new ReportValidationError('invalid-report', 'Report nesting limit exceeded.');
    if (entry.value && typeof entry.value === 'object') {
      for (const child of Object.values(entry.value)) pending.push({ value: child, depth: entry.depth + 1 });
    }
  }
  const result = reportSchema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    // Never echo captured values or attacker-controlled property names in an error.
    throw new ReportValidationError('invalid-report', `Invalid report structure${first?.code === 'custom' ? `: ${first.message}` : '.'}`);
  }
  return result.data;
}
