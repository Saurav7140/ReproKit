import { navigateWorkspace, editReportDetails, chooseAppearance } from './workspace';
import { test, expect, type Page } from '@playwright/test';
import fixture from '../packages/core/fixtures/web-report.json' with { type: 'json' };

// UI transport fixture only. Real Auth/Storage integration is a separate configured-project gate.
const base = 'http://127.0.0.1:5177/';
const api = 'https://hosted-ui-test.supabase.co';
const owner = '11111111-1111-4111-8111-111111111111';
const project = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function session() {
  const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = { id: owner,aud: 'authenticated',role: 'authenticated',email: 'synthetic@example.invalid',email_confirmed_at: new Date().toISOString(),app_metadata: { provider: 'email',providers: ['email'] },user_metadata: {},identities: [],created_at: new Date().toISOString() };
  return { access_token: `${encoded({ alg: 'HS256',typ: 'JWT' })}.${encoded({ sub: owner,role: 'authenticated',aud: 'authenticated',exp: Math.floor(Date.now()/1000)+3600 })}.synthetic-signature`,refresh_token: 'synthetic-refresh',expires_in: 3600,token_type: 'bearer',user };
}
async function mock(page: Page, options: { uploaded?:boolean; missingMigration?:boolean } = {}) {
  let uploaded = Boolean(options.uploaded); let projectRemoved=false; let uploadCalls = 0; let readCalls = 0; let removed = false; let deleteCalls = 0;
  let current = structuredClone(fixture); let status = 'open';
  const counts = { refreshes: 0,signups: 0,resets: 0,updates: 0,intakeReads:0,intakeSaves:0,projectDeletes:0 };
  let intake: {project_id:string;public_key:string;origin:string;enabled:boolean}|null=null;
  const metadata = () => ({ id,project_id: project,report_id: fixture.id,title: current.title,platform: 'web',status,lifecycle: deleteCalls === 1 ? 'deleting' : 'ready',created_at: new Date().toISOString(),expires_at: new Date(Date.now()+86400000).toISOString(),lease_until: null,size_bytes: 2500 });
  await page.route(`${api}/**`, async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const headers = { 'content-type': 'application/json','access-control-allow-origin': 'http://127.0.0.1:5177','access-control-allow-headers': '*','access-control-allow-methods': 'GET,POST,PATCH,DELETE,PUT,OPTIONS','access-control-expose-headers': 'content-range' };
    const send = (value: unknown, code = 200, extra = {}) => route.fulfill({ status: code,headers: { ...headers,...extra },body: JSON.stringify(value) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204,headers });
    if (url.pathname.endsWith('/token')) { if (url.searchParams.get('grant_type') === 'refresh_token') counts.refreshes++; return send(session()); }
    if (url.pathname.endsWith('/signup')) { counts.signups++; return send({ user: session().user }); }
    if (url.pathname.endsWith('/recover')) { counts.resets++; return send({}); }
    if (url.pathname.endsWith('/resend') || url.pathname.endsWith('/logout')) return send({});
    if (url.pathname.endsWith('/user')) { if (req.method() === 'PUT') counts.updates++; return send(session().user); }
    if (url.pathname === '/rest/v1/projects') return send(projectRemoved ? [] : [{ id: project,name: 'Synthetic project',created_at: new Date().toISOString() }]);
    if (url.pathname === '/rest/v1/rpc/delete_project') { counts.projectDeletes++; if(options.missingMigration)return send({code:'PGRST202',message:'Function missing'},404); if(uploaded&&!removed)return send({message:'project_not_empty'},400); projectRemoved=true;return send(null); }
    if(url.pathname==='/rest/v1/website_intakes'){counts.intakeReads++;return send(intake);}
    if(url.pathname==='/rest/v1/rpc/configure_website_intake'){counts.intakeSaves++;const args=req.postDataJSON();intake={project_id:project,public_key:args.p_rotate?'dddddddd-dddd-4ddd-8ddd-dddddddddddd':'cccccccc-cccc-4ccc-8ccc-cccccccccccc',origin:args.p_origin,enabled:args.p_enabled};return send(intake);}
    if (url.pathname === '/rest/v1/reports') {
      if (req.method() === 'PATCH') { status = req.postDataJSON().status; return send(metadata()); }
      const rows = uploaded && !removed ? [metadata()] : [];
      return send(rows,200,{ 'content-range': rows.length ? '0-0/1' : '*/0' });
    }
    if (url.pathname === '/functions/v1/reprokit') {
      const op = url.searchParams.get('op');
      if (op === 'upload') {
        uploadCalls++; current = req.postDataJSON();
        if (uploadCalls === 1) return send({ error: 'Session expired.' },401);
        if (uploadCalls === 2) return send({ error: 'Temporary failure. Your local report is unchanged.' },503);
        uploaded = true; return send({ report: metadata() },201);
      }
      if (op === 'read') { readCalls++; return send({ url: `${api}/storage/v1/object/sign/recordings/synthetic?token=synthetic`,expiresIn: 60 }); }
      if (op === 'delete') { deleteCalls++; if (deleteCalls === 1) return send({ error: 'Removal queued for retry.' },503); removed = true; return send({ deleted: true }); }
    }
    if (url.pathname.startsWith('/storage/v1/object/sign/recordings/')) return send(current);
    return send({ error: 'Unmocked UI request' },500);
  });
  return { counts,get deletes() { return deleteCalls; },get uploads() { return uploadCalls; },get reads() { return readCalls; } };
}
async function signIn(page: Page) {
  await page.getByLabel('Email',{ exact: true }).fill('synthetic@example.invalid');
  await page.getByLabel('Password',{ exact: true }).fill('synthetic-password-only');
  await page.getByRole('button',{ name: 'Sign in',exact: true }).click();
  await expect(page.getByText('Signed in as synthetic@example.invalid')).toBeVisible();
}

test('project trash buttons confirm deletion, support cancellation and preserve the local report', async ({page}) => {
  const state=await mock(page); await page.goto(base);
  await page.locator('input[type=file]').setInputFiles({name:'local.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await navigateWorkspace(page,'Projects'); await signIn(page);
  const remove=page.getByRole('button',{name:'Delete project Synthetic project',exact:true});
  await remove.click(); await expect(page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await page.keyboard.press('Escape'); await expect(remove).toBeFocused(); expect(state.counts.projectDeletes).toBe(0);
  for(const theme of ['light','dark']) {
    await page.setViewportSize({width:1440,height:900});await chooseAppearance(page,theme);
    for(const width of [1440,768,390]) { await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/screenshots/project-delete-${theme}-${width}.png`,fullPage:true}); }
  }
  await remove.click();await page.getByRole('dialog').getByRole('button',{name:'Delete project',exact:true}).click();
  await expect(page.getByText('No projects yet.',{exact:true})).toBeVisible();expect(state.counts.projectDeletes).toBe(1);expect(state.deletes).toBe(0);
  await navigateWorkspace(page,'Reports'); await expect(page.getByRole('heading',{name:fixture.title,exact:true})).toBeVisible();
});

test('nonempty project deletion keeps the project on storage failure and removes it after a safe retry', async ({page}) => {
  const state=await mock(page,{uploaded:true});await page.goto(base+'?view=hosted');await signIn(page);
  const remove=page.getByRole('button',{name:'Delete project Synthetic project',exact:true});
  await remove.click();await page.getByRole('dialog').getByRole('button',{name:'Delete project',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Project deletion did not finish');await expect(remove).toBeVisible();expect(state.deletes).toBe(1);
  await remove.click();await page.getByRole('dialog').getByRole('button',{name:'Delete project',exact:true}).click();
  await expect(page.getByText('No projects yet.',{exact:true})).toBeVisible();expect(state.deletes).toBe(2);expect(state.counts.projectDeletes).toBe(3);
});

test('a missing project-deletion migration fails before any report is removed', async ({page}) => {
  const state=await mock(page,{uploaded:true,missingMigration:true});await page.goto(base+'?view=hosted');await signIn(page);
  await page.getByRole('button',{name:'Delete project Synthetic project',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete project',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('latest backend migration');expect(state.deletes).toBe(0);
  await expect(page.getByRole('button',{name:'Delete project Synthetic project',exact:true})).toBeVisible();
});

test('owner website intake stays opt-in, validates site origin, saves/disables and rotates public configuration',async({page})=>{
  const state=await mock(page);await page.goto(base+'?view=hosted');await signIn(page);await page.getByRole('button',{name:'Synthetic project',exact:true}).click();expect(state.counts.intakeReads).toBe(0);
  await page.getByText('Website SDK intake',{exact:true}).click();await expect(page.getByRole('button',{name:'Save website intake',exact:true})).toBeEnabled();await expect(page.getByRole('checkbox',{name:'Enable public website submissions'})).not.toBeChecked();
  await page.getByLabel('Allowed website origin').fill('https://sample.invalid/private');await page.getByRole('button',{name:'Save website intake',exact:true}).click();await expect(page.getByRole('alert')).toContainText('without a path');expect(state.counts.intakeSaves).toBe(0);
  await page.getByLabel('Allowed website origin').fill('http://127.0.0.1:5176');await page.getByRole('checkbox',{name:'Enable public website submissions'}).check();await page.getByRole('button',{name:'Save website intake',exact:true}).click();await expect(page.getByLabel('Public project key')).toHaveValue('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  await page.getByRole('button',{name:'Rotate public key',exact:true}).click();await expect(page.getByLabel('Public project key')).toHaveValue('dddddddd-dddd-4ddd-8ddd-dddddddddddd');await page.getByRole('checkbox',{name:'Enable public website submissions'}).uncheck();await page.getByRole('button',{name:'Save website intake',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Enable public website submissions'})).not.toBeChecked();expect(state.counts.intakeSaves).toBe(3);
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/screenshots/phase7-intake-ui-${width}.png`,fullPage:true});}
});

test('hosted UI keeps uploads explicit, preserves drafts on failure and supports private review/status/deletion/sign-out', async ({ page }) => {
  const state = await mock(page);
  await page.goto(base);
  await page.locator('input[type=file]').setInputFiles({ name: 'synthetic.json',mimeType: 'application/json',buffer: Buffer.from(JSON.stringify(fixture)) });
  await editReportDetails(page);await page.getByLabel('Report title',{ exact: true }).fill('Reviewed synthetic report');
  await navigateWorkspace(page, 'Projects');
  await signIn(page);
  await page.getByRole('button',{ name: 'Synthetic project',exact: true }).click();
  await expect(page.getByRole('button',{ name: 'Upload reviewed report' })).toBeDisabled();
  expect(state.uploads).toBe(0);
  await navigateWorkspace(page, 'Reports');
  await page.getByRole('button',{ name: 'Save details' }).click();
  await navigateWorkspace(page, 'Projects');
  await page.getByRole('button',{ name: 'Upload reviewed report' }).click();
  await expect(page.getByRole('alert')).toContainText('Your local report is unchanged');
  expect(state.counts.refreshes).toBe(1);
  await navigateWorkspace(page, 'Reports');
  await expect(page.getByRole('heading',{ name: 'Reviewed synthetic report',exact: true })).toBeVisible();
  await navigateWorkspace(page, 'Projects');
  await page.getByRole('button',{ name: 'Upload reviewed report' }).click();
  await expect(page.locator('.hosted-report-list')).toContainText('Reviewed synthetic report');
  await page.getByLabel('Status for Reviewed synthetic report').selectOption('investigating');
  await expect(page.getByLabel('Status for Reviewed synthetic report')).toHaveValue('investigating');
  await page.getByRole('button',{ name: 'Open report',exact: true }).click();
  await expect(page.getByRole('heading',{ name: 'Open hosted copy' })).toBeVisible(); expect(state.reads).toBe(1);
  const hosted = page.locator('.hosted-open');
  await editReportDetails(hosted);await hosted.getByLabel('Report title',{ exact: true }).fill('Edited open copy only');
  await hosted.getByRole('button',{ name: 'Save details',exact: true }).click();
  await expect(hosted.getByRole('heading',{ name: 'Edited open copy only',exact: true })).toBeVisible();
  expect(await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map((node) => node.id); return ids.length === new Set(ids).size; })).toBe(true);
  for (const theme of ['light','dark']) {
    await page.setViewportSize({ width:1440,height:900 });
    await chooseAppearance(page,theme);
    for (const width of [1440,768,390]) {
      await page.setViewportSize({ width,height:900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({ path: `docs/screenshots/dashboard-projects-${theme}-${width}.png`,fullPage:true });
    }
  }
  await page.getByRole('button',{ name: 'Delete hosted report',exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button',{ name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{ name: 'Delete hosted report',exact: true }).click();
  await page.getByRole('dialog').getByRole('button',{ name: 'Delete hosted report',exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('queued for retry');
  await page.getByRole('button',{ name: 'Delete hosted report',exact: true }).click();
  await page.getByRole('dialog').getByRole('button',{ name: 'Delete hosted report',exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No reports in this project yet', exact: true })).toBeVisible();
  await page.getByRole('button',{ name: 'Sign out',exact: true }).click();
  await expect(page.getByRole('heading',{ name: 'Sign in',exact: true })).toBeVisible();
  await expect(page.getByText('Open hosted copy',{ exact: true })).toHaveCount(0);
  await navigateWorkspace(page, 'Reports');
  await expect(page.getByRole('heading',{ name: 'Reviewed synthetic report',exact: true })).toBeVisible();
});

test('auth UI exposes signup confirmation, reset and recovered-password flows without sending real email', async ({ page }) => {
  const state = await mock(page); await page.goto(`${base}?view=hosted`);
  await page.getByRole('button',{ name: 'Create an account',exact: true }).click();
  await page.getByLabel('Email',{ exact: true }).fill('synthetic@example.invalid');
  await page.getByLabel('Password',{ exact: true }).fill('synthetic-password-only');
  await page.getByRole('button',{ name: 'Create account',exact: true }).click();
  await expect(page.getByRole('status')).toContainText('confirmation link'); expect(state.counts.signups).toBe(1);
  await page.getByRole('button',{ name: 'Forgot password?',exact: true }).click();
  await page.getByRole('button',{ name: 'Send reset link',exact: true }).click();
  await expect(page.getByRole('status')).toContainText('If that account exists'); expect(state.counts.resets).toBe(1);
  await page.getByRole('button',{ name: 'Back to sign in',exact: true }).click(); await signIn(page);
  await page.goto(`${base}?view=hosted&recovery=1`);
  await expect(page.getByRole('heading',{ name: 'Choose a new password' })).toBeVisible();
  await page.getByLabel('New password',{ exact: true }).fill('new-synthetic-password');
  await page.getByLabel('Confirm new password',{ exact: true }).fill('new-synthetic-password');
  await page.getByRole('button',{ name: 'Update password',exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Password updated'); expect(state.counts.updates).toBe(1);
  await page.getByRole('button',{ name: 'Sign out',exact: true }).click();
  await page.goto(`${base}?view=hosted&recovery=1#error=access_denied&error_code=otp_expired&error_description=PRIVATE_PROVIDER_DETAIL`);
  await expect(page.getByRole('alert')).toContainText('Request a new confirmation or reset email');
  await expect(page.locator('body')).not.toContainText('PRIVATE_PROVIDER_DETAIL');
  await expect(page).toHaveURL(`${base}?view=hosted`);
  await signIn(page);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
