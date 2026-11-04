import { LIMITS, parseReport, ReportValidationError, hostedReportSchema } from './report.js';

type Row = ReturnType<typeof hostedReportSchema.parse> & { owner_id: string; storage_path: string; lease_id: string | null };
export type Services = {
  user: (token: string) => Promise<string | null>;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  find: (owner: string, id: string) => Promise<unknown>;
  upload: (path: string, text: string) => Promise<void>;
  sign: (path: string) => Promise<string>;
  remove: (path: string) => Promise<void>;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const errors: Record<string, [number, string]> = {
  unauthorized: [401, 'Sign in again. Your local report is unchanged.'],
  not_found: [404, 'Report or project unavailable.'],
  busy: [409, 'Work is already in progress. Retry after its lease expires; your local report is unchanged.'],
  report_conflict: [409, 'A different version of this report is already saved. The existing report was not overwritten.'],
  rate_limit: [429, 'Upload limit reached: 20 attempts per hour. Retry later.'],
  report_limit: [429, 'This account has reached its 100-report limit. Remove reports before uploading more.'],
  body_timeout: [408, 'Reading the report timed out. Your local report is unchanged.'],
};
function fail(code: string): never { throw new Error(code); }
function row(value: unknown): Row {
  const parsed = hostedReportSchema.parse(value);
  const extra = value as { owner_id?: string; storage_path?: string; lease_id?: string | null };
  if (!extra.owner_id || !uuid.test(extra.owner_id) || extra.storage_path !== `${extra.owner_id}/${parsed.id}.reprokit.json` || extra.lease_id !== null && (typeof extra.lease_id !== 'string' || !uuid.test(extra.lease_id))) fail('invalid_server_row');
  return { ...parsed, owner_id: extra.owner_id, storage_path: extra.storage_path, lease_id: extra.lease_id };
}
export function first(value: unknown): Row | null {
  if (!Array.isArray(value)) fail('invalid_server_row');
  return value.length ? row(value[0]) : null;
}
export async function bodyText(request: Request): Promise<string> {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > LIMITS.bytes)) throw new ReportValidationError('too-large', 'Report exceeds the 5 MiB limit.');
  if (!request.body) fail('invalid_body');
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0; let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 15_000);
  try {
    while (true) {
      const next = await reader.read();
      if (timedOut) fail('body_timeout');
      if (next.done) break;
      size += next.value.byteLength;
      if (size > LIMITS.bytes) { await reader.cancel(); throw new ReportValidationError('too-large', 'Report exceeds the 5 MiB limit.'); }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { fail('invalid_body'); }
  } finally { clearTimeout(timer); reader.releaseLock(); }
}
async function matchesSecret(provided: string, expected: string): Promise<boolean> {
  if (expected.length < 32 || provided.length > 1024) return false;
  const hashes = await Promise.all([provided, `Bearer ${expected}`].map((value) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
  const a = new Uint8Array(hashes[0]!); const b = new Uint8Array(hashes[1]!); let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i]! ^ b[i]!;
  return difference === 0;
}

export function createHandler(services: Services, config: { origin: string; cleanupSecret: string }) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const extensionOrigin = origin !== null && /^chrome-extension:\/\/[a-p]{32}$/.test(origin);
    const headers = { 'Access-Control-Allow-Origin': extensionOrigin ? origin : config.origin, 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
    const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
    if (origin && origin !== config.origin && !extensionOrigin) return Response.json({ error: 'Origin unavailable.' }, { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url); const operation = url.searchParams.get('op');
    try {
      if (operation === 'cleanup') {
        if (request.method !== 'POST' || !await matchesSecret(request.headers.get('authorization') ?? '', config.cleanupSecret)) fail('unauthorized');
        const claimed = await services.rpc('claim_cleanup');
        if (!Array.isArray(claimed) || claimed.length > 50) fail('invalid_server_row');
        let removed = 0; let failed = 0;
        for (const value of claimed) {
          const report = row(value);
          try { await services.remove(report.storage_path); await services.rpc('finish_delete', { p_owner: report.owner_id, p_id: report.id, p_lease: report.lease_id }); removed++; }
          catch { failed++; }
        }
        return json({ removed, failed }, failed ? 503 : 200);
      }
      const bearer = /^Bearer (\S{1,8192})$/.exec(request.headers.get('authorization') ?? '')?.[1];
      if (!bearer) fail('unauthorized');
      const owner = await services.user(bearer);
      if (!owner || !uuid.test(owner)) fail('unauthorized');
      if (operation === 'upload' && request.method === 'POST') {
        const project = url.searchParams.get('project');
        if (!project || !uuid.test(project)) return json({ error: 'Choose a valid project.' }, 400);
        await services.rpc('charge_ingest', { p_owner: owner, p_project: project });
        const report = parseReport(await bodyText(request));
        const text = JSON.stringify(report); const bytes = new TextEncoder().encode(text);
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
        const reserved = first(await services.rpc('begin_upload', { p_owner: owner, p_project: project, p_report: report.id, p_title: report.title, p_platform: report.source.platform, p_hash: hash, p_size: bytes.byteLength }));
        if (!reserved || reserved.owner_id !== owner) fail('not_found');
        if (reserved.lifecycle === 'ready') return json({ report: hostedReportSchema.parse(reserved) });
        if (reserved.lifecycle !== 'pending' || !reserved.lease_id) fail('invalid_server_row');
        await services.upload(reserved.storage_path, text);
        const ready = first(await services.rpc('complete_upload', { p_owner: owner, p_id: reserved.id, p_lease: reserved.lease_id }));
        if (!ready || ready.owner_id !== owner || ready.lifecycle !== 'ready') fail('busy');
        return json({ report: hostedReportSchema.parse(ready) }, 201);
      }
      const id = url.searchParams.get('id');
      if (!id || !uuid.test(id)) return json({ error: 'Choose a valid report.' }, 400);
      if (operation === 'read' && request.method === 'GET') {
        const result = await services.find(owner, id);
        if (!result) fail('not_found');
        const report = row(result);
        if (report.owner_id !== owner || report.lifecycle !== 'ready' || Date.parse(report.expires_at) <= Date.now()) fail('not_found');
        return json({ url: await services.sign(report.storage_path), expiresIn: 60 });
      }
      if (operation === 'delete' && request.method === 'DELETE') {
        const report = first(await services.rpc('begin_delete', { p_owner: owner, p_id: id }));
        if (!report) return json({ deleted: true });
        if (report.owner_id !== owner || report.lifecycle !== 'deleting' || !report.lease_id) fail('not_found');
        await services.remove(report.storage_path);
        await services.rpc('finish_delete', { p_owner: owner, p_id: report.id, p_lease: report.lease_id });
        return json({ deleted: true });
      }
      return json({ error: 'Unsupported operation.' }, 405);
    } catch (failure) {
      if (failure instanceof ReportValidationError) return json({ error: failure.message }, failure.code === 'too-large' ? 413 : 400);
      const code = failure instanceof Error ? failure.message : '';
      const known = errors[code];
      if (known) return json({ error: known[1] }, known[0]);
      if (code === 'invalid_body') return json({ error: 'Invalid request body.' }, 400);
      return json({ error: 'The operation could not finish. Your local report is unchanged. Retry later; unfinished hosted work is retained for recovery.' }, 503);
    }
  };
}
