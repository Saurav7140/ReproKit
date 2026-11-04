import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../../packages/core/fixtures/web-report.json';
import { createHandler, type Services } from '../functions/_shared/handler.ts';
import { parseReport as clientParse } from '../../packages/core/src/report.ts';
import { parseReport as serverParse } from '../functions/_shared/report.js';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const project = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const lease = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const secret = 'cleanup-test-only-'.repeat(4);
const row = (extra = {}) => ({ id,project_id: project,report_id: fixture.id,owner_id: owner,title: 'Report',platform: 'web',status: 'open',lifecycle: 'pending',created_at: new Date().toISOString(),expires_at: new Date(Date.now()+86_400_000).toISOString(),lease_until: new Date(Date.now()+900_000).toISOString(),lease_id: lease,storage_path: `${owner}/${id}.reprokit.json`,size_bytes: 100,...extra });
function setup(overrides: Partial<Services> = {}) {
  const calls: { name: string; args?: unknown }[] = [];
  const services: Services = {
    user: async (token) => { calls.push({ name: 'user' }); return token === 'valid-session' ? owner : null; },
    rpc: async (name,args) => { calls.push({ name,args }); return name === 'begin_upload' ? [row({ size_bytes: args!.p_size })] : name === 'complete_upload' ? [row({ lifecycle: 'ready',lease_id: null,lease_until: null })] : name === 'begin_delete' ? [row({ lifecycle: 'deleting' })] : name === 'claim_cleanup' ? [] : null; },
    find: async () => row({ lifecycle: 'ready' }),
    upload: async (path,text) => { calls.push({ name: 'upload',args: { path,report: serverParse(text) } }); },
    sign: async (path) => { calls.push({ name: 'sign',args: path }); return 'https://project.supabase.co/private-signed-read'; },
    remove: async (path) => { calls.push({ name: 'remove',args: path }); },
    ...overrides,
  };
  return { services,calls,handler: createHandler(services,{ origin: 'http://127.0.0.1:5173',cleanupSecret: secret }) };
}
const request = (operation = 'upload', body: unknown = fixture, token = 'valid-session') => new Request(`https://project.supabase.co/functions/v1/reprokit?op=${operation}&project=${project}&id=${id}`, { method: operation === 'read' ? 'GET' : operation === 'delete' ? 'DELETE' : 'POST', headers: { Authorization: `Bearer ${token}`,Origin: 'http://127.0.0.1:5173' }, ...(operation === 'upload' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });

test('server bundle uses the same report validator and hostile-input rejection as the client', () => {
  assert.deepEqual(serverParse(JSON.stringify(fixture)),clientParse(JSON.stringify(fixture)));
  for (const input of ['{','{}',JSON.stringify({ ...fixture,cookies: 'PRIVATE' }),JSON.stringify({ ...fixture,formatVersion: 999 })]) assert.throws(() => serverParse(input));
});

test('bearer authentication and CORS cannot be replaced by a project key or allowed origin', async () => {
  const { handler,calls } = setup();
  assert.equal((await handler(request('upload',fixture,'sb_publishable_not_a_user'))).status,401);
  assert.equal(calls.some((call) => call.name === 'begin_upload'),false);
  const foreign = request(); foreign.headers.set('Origin','https://untrusted.invalid');
  assert.equal((await handler(foreign)).status,403);
  const noToken = request(); noToken.headers.delete('Authorization');
  assert.equal((await handler(noToken)).status,401);
  assert.equal((await handler(new Request('https://project.supabase.co',{ method: 'OPTIONS',headers: { Origin: 'http://127.0.0.1:5173' } }))).status,204);
});

test('extension CORS permits browser requests but never authenticates an extension', async () => {
  const {handler}=setup(); const origin='chrome-extension://'+'a'.repeat(32);
  const valid=request();valid.headers.set('Origin',origin);
  const response=await handler(valid);assert.equal(response.status,201);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  const anonymous=request('upload',fixture,'sb_publishable_not_a_session');anonymous.headers.set('Origin',origin);
  assert.equal((await handler(anonymous)).status,401);
  for(const invalid of ['null','chrome-extension://bad','https://'+ 'a'.repeat(32),'chrome-extension://'+'a'.repeat(32)+'.evil']){const attempt=request();attempt.headers.set('Origin',invalid);assert.equal((await handler(attempt)).status,403);}
});

test('malformed, unsupported and oversized bodies are bounded before storage reservation or writes', async () => {
  for (const body of ['{',JSON.stringify({ ...fixture,formatVersion: 999 }),JSON.stringify({ ...fixture,'PRIVATE_UNKNOWN': 'SECRET' }),'x'.repeat(5*1024*1024+1)]) {
    const { handler,calls } = setup(); const response = await handler(request('upload',body));
    assert.ok([400,413].includes(response.status));
    assert.equal(calls.some((call) => call.name === 'begin_upload' || call.name === 'upload'),false);
    assert.equal((await response.text()).includes('PRIVATE_UNKNOWN'),false);
  }
});

test('validated uploads use authenticated ownership, canonical JSON, hash, lease and storage-before-ready order', async () => {
  const { handler,calls } = setup(); const response = await handler(request());
  assert.equal(response.status,201);
  assert.deepEqual(calls.map((call) => call.name),['user','charge_ingest','begin_upload','upload','complete_upload']);
  assert.equal((calls.find((call) => call.name === 'begin_upload')!.args as { p_owner: string }).p_owner,owner);
  assert.match((calls.find((call) => call.name === 'begin_upload')!.args as { p_hash: string }).p_hash,/^[0-9a-f]{64}$/);
  assert.equal((await response.json()).report.lifecycle,'ready');
});

test('storage failures retain pending metadata and do not claim upload completion or echo provider secrets', async () => {
  const { handler,calls } = setup({ upload: async () => { throw new Error('SECRET_PROVIDER_DETAIL'); } });
  const response = await handler(request()); assert.equal(response.status,503);
  assert.equal(calls.some((call) => call.name === 'complete_upload'),false);
  assert.equal((await response.text()).includes('SECRET_PROVIDER_DETAIL'),false);
});

test('signed reads require the current owner, ready state and unexpired retention', async () => {
  for (const item of [row({ lifecycle: 'ready',owner_id: other,storage_path: `${other}/${id}.reprokit.json` }),row({ lifecycle: 'pending' }),row({ lifecycle: 'ready',expires_at: new Date(0).toISOString() })]) {
    const { handler,calls } = setup({ find: async () => item });
    assert.equal((await handler(request('read'))).status,404);
    assert.equal(calls.some((call) => call.name === 'sign'),false);
  }
  const { handler } = setup(); const result = await handler(request('read'));
  assert.equal(result.status,200); assert.equal((await result.json()).expiresIn,60);
});

test('delete removes storage before metadata, and failed deletion remains recoverable', async () => {
  const good = setup(); assert.equal((await good.handler(request('delete'))).status,200);
  assert.deepEqual(good.calls.map((call) => call.name),['user','begin_delete','remove','finish_delete']);
  const failed = setup({ remove: async () => { throw new Error('offline'); } });
  assert.equal((await failed.handler(request('delete'))).status,503);
  assert.equal(failed.calls.some((call) => call.name === 'finish_delete'),false);
});

test('cleanup needs its server-only secret and retains failures for the next leased attempt', async () => {
  const jobs = [row({ lifecycle: 'deleting' }),row({ id: project,lifecycle: 'deleting',storage_path: `${owner}/${project}.reprokit.json` })];
  const finished: string[] = [];
  const { handler } = setup({ rpc: async (name,args) => { if (name === 'claim_cleanup') return jobs; if (name === 'finish_delete') finished.push(args!.p_id as string); return null; },remove: async (path) => { if (path.includes(project)) throw Error('offline'); } });
  assert.equal((await handler(request('cleanup',null))).status,401);
  const clean = request('cleanup',null); clean.headers.set('Authorization',`Bearer ${secret}`);
  const response = await handler(clean); assert.equal(response.status,503);
  assert.deepEqual(await response.json(),{ removed: 1,failed: 1 }); assert.deepEqual(finished,[id]);
});

test('ingestion rate errors stop before parsing/writing and completed duplicates do not re-upload', async () => {
  const limited = setup({ rpc: async () => { throw Error('rate_limit'); } });
  assert.equal((await limited.handler(request())).status,429);
  assert.equal(limited.calls.some((call) => call.name === 'upload'),false);
  const complete = setup({ rpc: async (name) => name === 'begin_upload' ? [row({ lifecycle: 'ready' })] : null });
  assert.equal((await complete.handler(request())).status,200);
  assert.equal(complete.calls.some((call) => call.name === 'upload'),false);
});
