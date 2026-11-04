import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hostedConfiguration, parseReport } from '../../packages/core/src/report.ts';

const sample = parseReport(readFileSync(new URL('../../packages/core/fixtures/web-report.json',import.meta.url),'utf8'));
if (!process.argv.includes('--run')) {
  assert(sample.id);
  assert.throws(() => hostedConfiguration('https://test.supabase.co','sb_secret_never_public'));
  console.log('Self-check passed. No network requests. Use --run only with a dedicated configured test project; see docs/hosted-setup.md.');
} else {
  void run().catch(() => { console.error('Live acceptance failed. No credentials/provider responses are printed. Check the named gate above and project logs.'); process.exitCode = 1; });
}

async function run() {
  const config = hostedConfiguration(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const ref = process.env.REPROKIT_TEST_PROJECT_REF;
  const key = process.env.REPROKIT_TEST_SECRET_KEY;
  const cleanup = process.env.REPROKIT_CLEANUP_SECRET;
  assert(config && ref && config.url === `https://${ref}.supabase.co` && key && cleanup && cleanup.length>=32,'Configure the public client and private dedicated-project test settings first.');
  const options = { auth: { persistSession: false,autoRefreshToken: false },global: { fetch: (input: RequestInfo | URL,init?: RequestInit) => fetch(input,{ ...init,signal: AbortSignal.timeout(30_000) }) } };
  const admin = createClient(config.url,key,options);
  const anonymous = createClient(config.url,config.key,options);
  const clients: SupabaseClient[] = []; const users: string[] = [];
  const bucket = admin.storage.from('recordings');
  let gate = 'preflight';
  const at = (name: string) => { gate = name; console.log(`Checking: ${name}`); };
  const data = <T extends { data: unknown; error: unknown }>(result: T,name: string): NonNullable<T['data']> => { assert(!result.error,name); return result.data as NonNullable<T['data']>; };
  async function call(op: string,token?: string,id?: string,body?: unknown) {
    const url = new URL(`${config!.url}/functions/v1/reprokit`);
    url.searchParams.set('op',op); if (id) url.searchParams.set(op === 'upload' ? 'project' : 'id',id);
    return fetch(url,{ method: op === 'read' ? 'GET' : op === 'delete' ? 'DELETE' : 'POST',
      headers: { apikey: config!.key,'Content-Type': 'application/json',...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),signal: AbortSignal.timeout(60_000) });
  }
  try {
    at('configured function denies anonymous access and recordings bucket is private');
    assert.equal((await call('read',undefined,randomUUID())).status,401);
    assert.equal(data(await admin.storage.getBucket('recordings'),'Bucket setup').public,false);
    for (let i=0;i<2;i++) {
      at(`create synthetic confirmed test account ${i+1}`);
      const email = `reprokit-test-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
      const user = data(await admin.auth.admin.createUser({ email,password,email_confirm: true }),'Test user creation').user;
      assert(user); users.push(user.id); console.log(`Temporary test account: ${user.id}`);
      const client = createClient(config.url,config.key,options); clients.push(client);
      data(await client.auth.signInWithPassword({ email,password }),'Test user sign-in');
    }
    const a = clients[0]!; const b = clients[1]!;
    const tokenA = data(await a.auth.getSession(),'Session A').session!.access_token;
    const tokenB = data(await b.auth.getSession(),'Session B').session!.access_token;
    at('owner project creation and authenticated validated ingestion');
    const created = data(await a.rpc('create_project',{ p_name: 'Synthetic acceptance project' }),'Create project');
    const project = (Array.isArray(created) ? created[0] : created).id as string;
    const report = { ...sample,id: randomUUID(),title: 'Synthetic hosted acceptance report' };
    const uploaded = await call('upload',tokenA,project,report); assert.equal(uploaded.status,201);
    const saved = (await uploaded.json()).report as { id: string };
    const duplicate = await call('upload',tokenA,project,report); assert.equal(duplicate.status,200); assert.equal((await duplicate.json()).report.id,saved.id);
    assert.equal((await call('upload',tokenA,project,{ ...report,title: 'Changed duplicate' })).status,409);
    assert.equal((await call('upload',tokenA,project,{ ...report,formatVersion: 999 })).status,400);
    const stored = data(await admin.from('reports').select('*').eq('id',saved.id).single(),'Saved metadata');
    at('two-account RLS, mutation and function isolation');
    assert.equal(data(await b.from('projects').select('id').eq('id',project),'Other account project lookup').length,0);
    assert.equal(data(await b.from('reports').select('id').eq('id',saved.id),'Other account report lookup').length,0);
    const changed = await b.from('reports').update({ status: 'resolved' }).eq('id',saved.id).select('id');
    assert(changed.error || changed.data?.length === 0);
    assert.equal((await call('read',tokenB,saved.id)).status,404);
    assert.equal((await call('upload',tokenB,project,report)).status,404);
    await call('delete',tokenB,saved.id);
    assert.equal(data(await admin.from('reports').select('status').eq('id',saved.id).single(),'Cross-account delete has no effect').status,'open');
    assert.equal(data(await a.from('reports').update({ status: 'investigating' }).eq('id',saved.id).select('status').single(),'Owner status update').status,'investigating');
    at('anonymous, owner and other account cannot directly sign/read/write private objects');
    for (const client of [anonymous,a,b]) {
      assert((await client.storage.from('recordings').createSignedUrl(stored.storage_path,60)).error);
      assert((await client.storage.from('recordings').download(stored.storage_path)).error);
      assert((await client.storage.from('recordings').upload(`${users[0]}/${randomUUID()}.json`,'{}',{ contentType: 'application/json' })).error);
    }
    const publicUrl = anonymous.storage.from('recordings').getPublicUrl(stored.storage_path).data.publicUrl;
    assert(!(await fetch(publicUrl,{ signal: AbortSignal.timeout(30_000) })).ok);
    at('owner receives a bounded-lived signed URL and real Storage content');
    const read = await call('read',tokenA,saved.id); assert.equal(read.status,200);
    const signed = await read.json(); assert.equal(signed.expiresIn,60); assert.equal(new URL(signed.url).origin,config.url);
    const object = await fetch(signed.url,{ signal: AbortSignal.timeout(30_000) }); assert(object.ok);
    assert.equal(parseReport(await object.text()).id,report.id);
    at('explicit deletion removes recording before metadata');
    assert.equal((await call('delete',tokenA,saved.id)).status,200);
    assert.equal(data(await admin.from('reports').select('id').eq('id',saved.id),'Deleted metadata').length,0);
    assert((await bucket.download(stored.storage_path)).error);
    at('expired ready and interrupted pending uploads are cleaned through the real function');
    const again = await call('upload',tokenA,project,{ ...report,id: randomUUID() }); assert.equal(again.status,201);
    const expired = (await again.json()).report.id as string;
    data(await admin.from('reports').update({ expires_at: new Date(Date.now()-60_000).toISOString() }).eq('id',expired).eq('owner_id',users[0]),'Expire only test-owned row');
    assert.equal((await call('read',tokenA,expired)).status,404);
    const text = JSON.stringify({ ...report,id: randomUUID() }); const pendingReport = JSON.parse(text);
    const pendingRows = data(await admin.rpc('begin_upload',{ p_owner: users[0],p_project: project,p_report: pendingReport.id,p_title: pendingReport.title,p_platform: pendingReport.source.platform,p_hash: createHash('sha256').update(text).digest('hex'),p_size: Buffer.byteLength(text) }),'Reserve interrupted test upload');
    const pending = pendingRows[0]; data(await bucket.upload(pending.storage_path,text,{ contentType: 'application/json' }),'Interrupted object write');
    data(await admin.from('reports').update({ created_at: new Date(Date.now()-7_200_000).toISOString(),lease_until: new Date(Date.now()-60_000).toISOString() }).eq('id',pending.id).eq('owner_id',users[0]),'Age only test-owned pending row');
    assert.equal((await call('cleanup',tokenA)).status,401);
    const cleaned = await call('cleanup',cleanup); assert.equal(cleaned.status,200); assert.equal((await cleaned.json()).failed,0);
    assert.equal(data(await admin.from('reports').select('id').in('id',[expired,pending.id]),'Cleanup metadata').length,0);
    assert((await bucket.download(`${users[0]}/${expired}.reprokit.json`)).error);
    assert((await bucket.download(pending.storage_path)).error);
    console.log('Live Auth/API/Storage isolation, ingestion, idempotency, deletion and cleanup checks passed. Email delivery and scheduled invocation still need manual checks.');
  } catch {
    console.error(`Failed gate: ${gate}`); throw new Error('live_acceptance_failed');
  } finally {
    for (const owner of users) {
      try {
        const rows = data(await admin.from('reports').select('id,storage_path').eq('owner_id',owner),'Test cleanup metadata');
        for (const row of rows) { data(await bucket.remove([row.storage_path]),'Test cleanup object'); data(await admin.from('reports').delete().eq('id',row.id).eq('owner_id',owner),'Test cleanup row'); }
        data(await admin.from('projects').delete().eq('owner_id',owner),'Test cleanup projects');
        data(await admin.auth.admin.deleteUser(owner),'Test cleanup account');
      } catch { console.error(`Test artifacts retained for retry under synthetic owner ${owner}. Remove objects with Storage API before metadata/account.`); process.exitCode = 1; }
    }
  }
}
