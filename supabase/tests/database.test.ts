import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = await PGlite.create();
after(() => db.close());
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const charlie = '33333333-3333-4333-8333-333333333333';
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema public,auth to anon,authenticated,service_role;
  grant execute on function auth.uid() to anon,authenticated,service_role;
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon,authenticated,service_role;
  grant all on storage.objects to anon,authenticated,service_role;
  create policy deliberately_broad_fixture_policy on storage.objects for all to anon,authenticated using(true) with check(true);
  insert into auth.users values('${alice}'),('${bob}'),('${charlie}');
`);
await db.exec(await readFile(new URL('../migrations/202611040001_hosted_reports.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../migrations/202611040002_website_intake.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../migrations/202611040003_project_deletion.sql', import.meta.url), 'utf8'));
async function as<T>(role: 'anon' | 'authenticated' | 'service_role', uid: string, sql: string, args: unknown[] = []) {
  await db.exec(`set role ${role}`);
  try { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]); return await db.query<T>(sql, args); }
  finally { await db.exec('reset role'); }
}
const projectA = (await as<{ id: string }>('authenticated', alice, 'select * from public.create_project($1)', ['Alice'])).rows[0]!.id;
const projectB = (await as<{ id: string }>('authenticated', bob, 'select * from public.create_project($1)', ['Bob'])).rows[0]!.id;
const hash = 'a'.repeat(64);
const sourceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
type Row = { id: string; owner_id: string; lease_id: string; lifecycle: string; storage_path: string };
async function begin(owner = alice, project = projectA, source = sourceId, contentHash = hash) {
  return (await as<Row>('service_role', '', 'select * from public.begin_upload($1,$2,$3,$4,$5,$6,$7)', [owner,project,source,'Report','web',contentHash,100])).rows[0]!;
}
let reserved: Row;

test('project deletion is owner-only, rejects remaining recordings and cascades intake only after reports are removed', async () => {
  const target = (await as<{ id:string }>('authenticated',alice,'select * from public.create_project($1)',['Delete fixture'])).rows[0]!.id;
  await as('authenticated',alice,'select * from public.configure_website_intake($1,$2,true,false)',[target,'https://delete-fixture.invalid']);
  await assert.rejects(as('anon','','select public.delete_project($1)',[target]),/permission denied/);
  await assert.rejects(as('authenticated',bob,'select public.delete_project($1)',[target]),/not_found/);
  const report = await begin(alice,target,crypto.randomUUID());
  await assert.rejects(as('authenticated',alice,'select public.delete_project($1)',[target]),/project_not_empty/);
  assert.equal((await db.query('select project_id from public.website_intakes where project_id=$1',[target])).rows.length,1);
  await db.query("update public.reports set lease_until=now()-interval '1 minute' where id=$1",[report.id]);
  const job = (await as<Row>('service_role','','select * from public.begin_delete($1,$2)',[alice,report.id])).rows[0]!;
  await as('service_role','','select public.finish_delete($1,$2,$3)',[alice,job.id,job.lease_id]);
  await as('authenticated',alice,'select public.delete_project($1)',[target]);
  assert.equal((await db.query('select id from public.projects where id=$1',[target])).rows.length,0);
  assert.equal((await db.query('select project_id from public.website_intakes where project_id=$1',[target])).rows.length,0);
  assert.equal((await as('authenticated',bob,'select id from public.projects where id=$1',[projectB])).rows.length,1);
});

test('projects and report mutation functions deny anonymous and cross-account access in real PostgreSQL RLS', async () => {
  assert.deepEqual((await as<{ id: string }>('authenticated',alice,'select id from public.projects')).rows.map((row) => row.id), [projectA]);
  assert.deepEqual((await as<{ id: string }>('authenticated',bob,'select id from public.projects')).rows.map((row) => row.id), [projectB]);
  await assert.rejects(as('anon','','select * from public.projects'), /permission denied/);
  await assert.rejects(as('authenticated',alice,'insert into public.projects(owner_id,name) values($1,$2)',[bob,'Forged']), /permission denied/);
  await assert.rejects(as('authenticated',alice,'select * from public.claim_cleanup()'), /permission denied/);
  await assert.rejects(begin(bob,projectA), /not_found/);
  reserved = await begin();
  assert.equal((await as('authenticated',bob,'select * from public.reports where id=$1',[reserved.id])).rows.length, 0);
  assert.equal((await as('authenticated',alice,'select * from public.reports where id=$1',[reserved.id])).rows.length, 1);
  await assert.rejects(as('anon','','select * from public.reports'), /permission denied/);
  await assert.rejects(as('authenticated',alice,'select * from public.begin_delete($1,$2)',[alice,reserved.id]), /permission denied/);
});

test('leases prevent concurrent uploads, stale completion and overwriting a report with different content', async () => {
  await assert.rejects(begin(), /busy/);
  await assert.rejects(begin(alice,projectA,sourceId,'b'.repeat(64)), /report_conflict/);
  await db.query("update public.reports set lease_until=now()-interval '1 minute' where id=$1",[reserved.id]);
  const retried = await begin();
  assert.notEqual(retried.lease_id, reserved.lease_id);
  assert.equal((await as('service_role','','select * from public.complete_upload($1,$2,$3)',[alice,reserved.id,reserved.lease_id])).rows.length,0);
  assert.equal((await as<Row>('service_role','','select * from public.complete_upload($1,$2,$3)',[alice,retried.id,retried.lease_id])).rows[0]!.lifecycle,'ready');
  assert.equal((await begin()).lifecycle,'ready');
  reserved = retried;
});

test('private recordings deny direct anonymous/owner/other-user access even with a broad unrelated storage policy', async () => {
  await as('service_role','','insert into storage.objects(bucket_id,name) values($1,$2)',['recordings',reserved.storage_path]);
  for (const [role,uid] of [['anon',''],['authenticated',alice],['authenticated',bob]] as const) {
    assert.equal((await as(role,uid,'select * from storage.objects where bucket_id=$1',['recordings'])).rows.length,0);
    await assert.rejects(as(role,uid,'insert into storage.objects(bucket_id,name) values($1,$2)',['recordings','forged']),/row-level security/);
  }
  const bucket = (await db.query<{ public: boolean; file_size_limit: number }>("select public,file_size_limit from storage.buckets where id='recordings'")).rows[0]!;
  assert.equal(bucket.public,false); assert.equal(Number(bucket.file_size_limit),5242880);
});

test('owners can update only their ready report status, never ownership, expiry, content or arbitrary metadata', async () => {
  await as('authenticated',alice,"update public.reports set status='investigating' where id=$1",[reserved.id]);
  assert.equal((await db.query<{ status: string }>('select status from public.reports where id=$1',[reserved.id])).rows[0]!.status,'investigating');
  assert.equal((await as('authenticated',bob,"update public.reports set status='resolved' where id=$1 returning id",[reserved.id])).rows.length,0);
  for (const column of ['owner_id','project_id','title','expires_at','storage_path','content_hash']) await assert.rejects(as('authenticated',alice,`update public.reports set ${column}=${column} where id=$1`,[reserved.id]), /permission denied|can only be updated to DEFAULT/);
  await assert.rejects(as('authenticated',alice,'delete from public.reports where id=$1',[reserved.id]), /permission denied/);
});

test('ingestion quota and project/report capacity cannot be bypassed through client writes', async () => {
  for (let i=0;i<20;i++) await as('service_role','','select public.charge_ingest($1,$2)',[alice,projectA]);
  await assert.rejects(as('service_role','','select public.charge_ingest($1,$2)',[alice,projectA]),/rate_limit/);
  await assert.rejects(as('authenticated',alice,'delete from public.ingest_limits'), /permission denied/);
  const projectC = (await as<{ id: string }>('authenticated',charlie,'select * from public.create_project($1)',['Capacity'])).rows[0]!.id;
  await db.query("insert into public.reports(project_id,owner_id,report_id,title,platform,content_hash,size_bytes) select $1,$2,gen_random_uuid(),'Capacity','web',$3,1 from generate_series(1,100)",[projectC,charlie,hash]);
  await assert.rejects(begin(charlie,projectC,crypto.randomUUID()), /report_limit/);
  for (let i=0;i<24;i++) await as('authenticated',charlie,'select * from public.create_project($1)',[`Project ${i}`]);
  await assert.rejects(as('authenticated',charlie,'select * from public.create_project($1)',['Over quota']), /project_limit/);
});

test('failed/expired work is claimable for cleanup and metadata deletion is guarded by a current owner lease', async () => {
  const pending = await begin(alice,projectA,crypto.randomUUID());
  await db.query("update public.reports set created_at=now()-interval '2 hours',lease_until=now()-interval '1 minute' where id=$1",[pending.id]);
  await db.query("update public.reports set expires_at=now()-interval '1 minute' where id=$1",[reserved.id]);
  const jobs = (await as<Row>('service_role','','select * from public.claim_cleanup()')).rows;
  assert.ok(jobs.some((row) => row.id===pending.id)); assert.ok(jobs.some((row) => row.id===reserved.id));
  assert.equal((await as('service_role','','select * from public.claim_cleanup()')).rows.length,0);
  const job = jobs.find((row) => row.id===reserved.id)!;
  await as('service_role','','select public.finish_delete($1,$2,$3)',[bob,job.id,job.lease_id]);
  assert.equal((await db.query('select id from public.reports where id=$1',[job.id])).rows.length,1);
  await as('service_role','','select public.finish_delete($1,$2,$3)',[alice,job.id,job.lease_id]);
  assert.equal((await db.query('select id from public.reports where id=$1',[job.id])).rows.length,0);
  await db.query("update public.reports set lease_until=now()-interval '1 minute' where id=$1",[pending.id]);
  assert.equal((await as<Row>('service_role','','select * from public.claim_cleanup()')).rows[0]!.id,pending.id);
});

test('website intake is owner-configured, opt-in and service-only for submissions',async()=>{
  await assert.rejects(as('anon','','select public.configure_website_intake($1,$2,true,false)',[projectA,'https://sample.invalid']),/permission denied/);
  await assert.rejects(as('authenticated',bob,'select public.configure_website_intake($1,$2,true,false)',[projectA,'https://sample.invalid']),/not_found/);
  for(const origin of ['null','https://sample.invalid/path','https://user:pass@sample.invalid','http://sample.invalid'])await assert.rejects(as('authenticated',alice,'select public.configure_website_intake($1,$2,true,false)',[projectA,origin]),/check constraint/);
  const intake=(await as<{public_key:string}>('authenticated',alice,'select * from public.configure_website_intake($1,$2,false,false)',[projectA,'https://sample.invalid'])).rows[0]!;
  const charge=(key=intake.public_key,origin='https://sample.invalid')=>as('service_role','','select public.charge_public_ingest($1,$2)',[key,origin]);
  await assert.rejects(charge(),/intake_unavailable/);
  assert.equal((await as('authenticated',bob,'select * from public.website_intakes')).rows.length,0);
  await assert.rejects(as('anon','','select * from public.website_intakes'),/permission denied/);
  await assert.rejects(as('authenticated',alice,'update public.website_intakes set enabled=true'),/permission denied/);
  await as('authenticated',alice,'select public.configure_website_intake($1,$2,true,false)',[projectA,'https://sample.invalid']);
  await assert.rejects(charge(intake.public_key,'https://evil.invalid'),/intake_unavailable/);
  await assert.rejects(as('authenticated',alice,'select public.charge_public_ingest($1,$2)',[intake.public_key,'https://sample.invalid']),/permission denied/);
  await assert.rejects(as('anon','','select * from public.begin_public_upload($1,$2,$3,$4,$5,100)',[intake.public_key,'https://sample.invalid',crypto.randomUUID(),'Report',hash]),/permission denied/);
  for(let i=0;i<10;i++)await charge();
  await assert.rejects(charge(),/public_rate_limit/);
  const rotated=(await as<{public_key:string}>('authenticated',alice,'select * from public.configure_website_intake($1,$2,true,true)',[projectA,'https://sample.invalid'])).rows[0]!;
  assert.notEqual(rotated.public_key,intake.public_key);
  await assert.rejects(charge(),/intake_unavailable/);
  await assert.rejects(charge(rotated.public_key),/public_rate_limit/);
  const source=crypto.randomUUID();
  const reserve=()=>as<Row>('service_role','','select * from public.begin_public_upload($1,$2,$3,$4,$5,100)',[rotated.public_key,'https://sample.invalid',source,'Website',hash]);
  const publicReport=(await reserve()).rows[0]!;assert.equal(publicReport.owner_id,alice);
  await assert.rejects(reserve(),/busy/);
  await as('service_role','','select public.complete_upload($1,$2,$3)',[alice,publicReport.id,publicReport.lease_id]);
  assert.equal((await reserve()).rows[0]!.id,publicReport.id);
  await db.query("insert into public.reports(project_id,owner_id,report_id,title,platform,content_hash,size_bytes) select $1,$2,gen_random_uuid(),'Website cap','web',$3,1 from generate_series(1,20)",[projectA,alice,hash]);
  await assert.rejects(as('service_role','','select * from public.begin_public_upload($1,$2,$3,$4,$5,100)',[rotated.public_key,'https://sample.invalid',crypto.randomUUID(),'Over cap',hash]),/public_report_limit/);
  assert.equal((await reserve()).rows[0]!.id,publicReport.id);
  await as('authenticated',alice,'select public.configure_website_intake($1,$2,false,false)',[projectA,'https://sample.invalid']);
  await assert.rejects(reserve(),/intake_unavailable/);
  await db.query("update public.website_ingest_limits set hour=now()-interval '3 days'");
  await as('service_role','','select public.claim_cleanup()');
  assert.equal((await db.query('select * from public.website_ingest_limits')).rows.length,0);
});
