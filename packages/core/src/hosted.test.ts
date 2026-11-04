import test from 'node:test';
import assert from 'node:assert/strict';
import { hostedConfiguration, projectNameSchema, hostedReportSchema, reportStatusSchema, dashboardReportUrl, readReportLink } from './hosted.js';

test('hosted configuration accepts only public client keys and safe service URLs', () => {
  assert.equal(hostedConfiguration(undefined,undefined),null);
  assert.deepEqual(hostedConfiguration('https://example.supabase.co','sb_publishable_'+'x'.repeat(24)),{ url: 'https://example.supabase.co',key: 'sb_publishable_'+'x'.repeat(24) });
  for (const role of ['service_role','authenticated']) {
    const key = `eyJheader.${btoa(JSON.stringify({ role }))}.signature`;
    assert.throws(() => hostedConfiguration('https://example.supabase.co',key),/Secret or service-role/);
  }
  assert.ok(hostedConfiguration('http://127.0.0.1:54321',`eyJheader.${btoa(JSON.stringify({ role: 'anon' }))}.signature`));
  for (const [url,key] of [['https://example.supabase.co','sb_secret_PRIVATE'],['http://outside.invalid','sb_publishable_'+'x'.repeat(24)],['https://user:PRIVATE@example.com','sb_publishable_'+'x'.repeat(24)],['SECRET_IN_BAD_URL','sb_publishable_'+'x'.repeat(24)],['https://example.supabase.co',undefined]]) {
    assert.throws(() => hostedConfiguration(url,key), (failure) => failure instanceof Error && !failure.message.includes('PRIVATE') && !failure.message.includes('SECRET_IN_BAD_URL'));
  }
});

test('hosted project/status/metadata bounds fail closed', () => {
  assert.equal(projectNameSchema.parse(' Project '),'Project');
  for (const name of ['', ' '.repeat(4), 'x'.repeat(81)]) assert.equal(projectNameSchema.safeParse(name).success,false);
  assert.equal(reportStatusSchema.safeParse('admin').success,false);
  assert.equal(hostedReportSchema.safeParse({ id:'bad',title:'x' }).success,false);
});

test('dashboard report links contain only validated IDs and a safe configured origin', () => {
  const project='11111111-1111-4111-8111-111111111111'; const report='22222222-2222-4222-8222-222222222222';
  const link=new URL(dashboardReportUrl('http://127.0.0.1:5173',project,report));
  assert.deepEqual(readReportLink(link.search),{project,report});
  assert.equal(readReportLink('?view=hosted'),null);
  for(const origin of ['javascript:alert(1)','https://user:secret@example.com','http://outside.invalid','https://example.com/path','https://example.com/?token=secret']) assert.throws(()=>dashboardReportUrl(origin,project,report));
  assert.throws(()=>dashboardReportUrl('https://example.com',project,'not-a-uuid'));
  for(const search of ['?project=bad&report=bad',`?project=${project}`]) assert.throws(()=>readReportLink(search));
});
