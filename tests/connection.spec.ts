import { editReportDetails } from './workspace';
import { test,expect,type BrowserContext,type Page } from '@playwright/test';
import { build } from 'vite';
import { copyFile,mkdtemp,readFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import fixture from '../packages/core/fixtures/web-report.json' with {type:'json'};
import { extensionIdAt,launch,start,reportFrom } from './extension';
import { parseReport,type Report } from '../packages/core/src/report';

const api='https://hosted-ui-test.supabase.co';
const project='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let path:string;let extensionId:string;
test.beforeAll(async()=>{
  path=await mkdtemp(resolve('test-results/connection-extension-'));extensionId=extensionIdAt(path);
  const keys=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_DASHBOARD_ORIGIN'] as const;
  const old=keys.map((key)=>process.env[key]);
  try{
    process.env.VITE_SUPABASE_URL=api;process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic_ui_fixture_only';process.env.VITE_DASHBOARD_ORIGIN='http://127.0.0.1:5177';
    await build({root:resolve('apps/extension'),configFile:resolve('apps/extension/vite.config.ts'),mode:'test',logLevel:'silent',build:{outDir:path,emptyOutDir:true}});
    for(const file of ['content.js','page.js','replay.js','replay.css'])await copyFile(resolve('apps/extension/dist',file),join(path,file));
  }finally{keys.forEach((key,index)=>{if(old[index]===undefined)delete process.env[key];else process.env[key]=old[index];});}
});
function session(){const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};return{access_token:`${encode({alg:'HS256'})}.${encode({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.synthetic`,refresh_token:'synthetic-refresh',expires_in:3600,token_type:'bearer',user};}
async function provider(context:BrowserContext,failInitially=false,refreshFails=false){
  const state={uploads:0,refreshes:0,reads:0};let report:Report=parseReport(JSON.stringify(fixture));
  const metadata=()=>({id,project_id:project,report_id:report.id,title:report.title,platform:'web',status:'open',lifecycle:'ready',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString(),lease_until:null,size_bytes:JSON.stringify(report).length});
  await context.route(`${api}/**`,async(route)=>{
    const req=route.request();const url=new URL(req.url());
    const headers={'content-type':'application/json','access-control-allow-origin':req.headers().origin??'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','access-control-expose-headers':'content-range'};
    const send=(value:unknown,status=200,extra={})=>route.fulfill({status,headers:{...headers,...extra},body:JSON.stringify(value)});
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
    if(url.pathname.endsWith('/token')){if(url.searchParams.get('grant_type')==='refresh_token'){state.refreshes++;if(refreshFails)return send({error:'invalid_grant',error_code:'refresh_token_not_found',msg:'Synthetic revoked refresh'},400);}return send(session());}
    if(url.pathname.endsWith('/user'))return send(session().user);
    if(url.pathname.endsWith('/logout'))return send({});
    if(url.pathname==='/rest/v1/projects')return send([{id:project,name:'Synthetic project',created_at:new Date().toISOString()}]);
    if(url.pathname==='/rest/v1/reports'){if(req.headers().accept?.includes('vnd.pgrst.object'))return send(metadata());return send([metadata()],200,{'content-range':'0-0/1'});}
    if(url.pathname==='/functions/v1/reprokit'){
      if(url.searchParams.get('op')==='upload'){state.uploads++;report=req.postDataJSON();if(failInitially&&state.uploads===1)return send({error:'Synthetic expired session'},401);if(failInitially&&state.uploads===2)return send({error:'Temporary upload failure. Your local report is unchanged.'},503);return send({report:metadata()},state.uploads===1?201:200);}
      if(url.searchParams.get('op')==='read'){state.reads++;return send({url:`${api}/storage/v1/object/sign/recordings/synthetic?token=synthetic`,expiresIn:60});}
    }
    if(url.pathname.startsWith('/storage/v1/object/sign/recordings'))return send(report);
    return send({error:'Unexpected fixture request'},500);
  });return state;
}
async function connect(page:Page){const sharing=page.locator('.review-sharing');if(await sharing.getAttribute('open')===null)await sharing.locator('summary').click();await page.getByRole('button',{name:'Connect to dashboard',exact:true}).click();await page.getByLabel('Account email').fill('synthetic@example.invalid');await page.getByLabel('Account password').fill('synthetic-password');await page.getByRole('button',{name:'Sign in to connect',exact:true}).click();await expect(page.getByText('Connected as synthetic@example.invalid')).toBeVisible();await page.getByLabel('Project',{exact:true}).selectOption(project);}

test('extension keeps upload explicit, retries safely, opens the dashboard report and disconnects offline',async()=>{
  const context=await launch(path);try{
    const state=await provider(context,true);const source=await context.newPage();await source.goto('http://127.0.0.1:5174/');const review=await start(context,source,extensionId);
    await source.getByTestId('submit-order').click();await review.getByRole('button',{name:'Stop recording',exact:true}).click();
    const captured=await reportFrom(review);expect(JSON.stringify(captured)).not.toContain('SYNTHETIC_');
    await editReportDetails(review);await review.getByLabel('Report title',{exact:true}).fill('Reviewed extension report');await connect(review);
    expect(state.uploads).toBe(0);await expect(review.getByRole('button',{name:'Upload reviewed report'})).toBeDisabled();
    await review.getByRole('button',{name:'Save details',exact:true}).click();await review.getByRole('button',{name:'Upload reviewed report'}).click();
    await expect(review.getByRole('alert')).toContainText('Your local report is unchanged');expect(state.refreshes).toBe(1);expect(state.uploads).toBe(2);
    await expect(review.getByRole('heading',{name:'Reviewed extension report',exact:true})).toBeVisible();
    await review.getByRole('button',{name:'Upload reviewed report'}).evaluate((node)=>{(node as HTMLButtonElement).click();(node as HTMLButtonElement).click();});
    await expect(review.getByRole('link',{name:'Open saved report in dashboard'})).toBeVisible();expect(state.uploads).toBe(3);
    const link=review.getByRole('link',{name:'Open saved report in dashboard'});const href=await link.getAttribute('href');expect(href).toContain(`project=${project}`);expect(href).toContain(`report=${id}`);expect(href).not.toContain('token');
    const opening=context.waitForEvent('page');await link.click();const dashboard=await opening;await dashboard.waitForLoadState();
    await dashboard.getByLabel('Email',{exact:true}).fill('synthetic@example.invalid');await dashboard.getByLabel('Password',{exact:true}).fill('synthetic-password');await dashboard.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(dashboard.locator('.hosted-open').getByRole('heading',{name:'Reviewed extension report',exact:true})).toBeVisible();expect(state.reads).toBe(1);
    for(const width of [1440,768,390]){await review.setViewportSize({width,height:900});expect(await review.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await review.getByRole('region',{name:'Dashboard connection'}).scrollIntoViewIfNeeded();await review.screenshot({path:`docs/screenshots/phase6-connection-fixture-${width}.png`});}
    expect(await review.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}))).toEqual({local:[],session:[]});
    await context.route(`${api}/auth/v1/logout**`,(route)=>route.abort('internetdisconnected'));await context.setOffline(true);await review.getByRole('button',{name:'Disconnect',exact:true}).click();await expect(review.getByRole('button',{name:'Connect to dashboard',exact:true})).toBeVisible();
    await expect(review.getByRole('heading',{name:'Reviewed extension report',exact:true})).toBeVisible();const download=review.waitForEvent('download');await review.getByRole('button',{name:'Export report',exact:true}).click();expect((await download).suggestedFilename()).toBe(`${captured.id}.reprokit.json`);
    await context.setOffline(false);await review.reload();await expect(review.getByRole('heading',{name:'Start an investigation',exact:true})).toBeVisible();await review.locator('.review-sharing > summary').click();await expect(review.getByRole('button',{name:'Connect to dashboard',exact:true})).toBeVisible();
  }finally{await context.close();}
});

test('expired connection and offline uploads preserve imported local evidence without storage or new permissions',async()=>{
  const context=await launch(path);try{
    const state=await provider(context,true,true);const page=await context.newPage();await page.goto(`chrome-extension://${extensionId}/review.html`);
    await page.locator('input[type=file]').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await connect(page);
    await page.getByRole('button',{name:'Upload reviewed report'}).click();await expect(page.getByRole('alert')).toContainText('Sign in again');expect(state.refreshes).toBe(1);
    await expect(page.getByRole('button',{name:'Connect to dashboard',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:fixture.title,exact:true})).toBeVisible();
    await connect(page);await context.route(`${api}/functions/v1/reprokit**`,(route)=>route.abort('internetdisconnected'));await context.setOffline(true);await page.getByRole('button',{name:'Upload reviewed report'}).click();await expect(page.getByRole('alert')).toContainText('Connection failed');await expect(page.getByRole('heading',{name:fixture.title,exact:true})).toBeVisible();
    const manifest=JSON.parse(await readFile(join(path,'manifest.json'),'utf8'));expect(manifest.permissions).toEqual(['activeTab','scripting']);expect(manifest.host_permissions??[]).toEqual([]);expect(manifest.content_security_policy.extension_pages).toContain(`connect-src ${api};`);
  }finally{await context.close();}
});

test('dashboard links reject malformed IDs and other projects without requesting a recording',async({page,context})=>{
  const state=await provider(context);
  await page.goto(`http://127.0.0.1:5177/?view=hosted&project=cccccccc-cccc-4ccc-8ccc-cccccccccccc&report=${id}`);
  await page.getByLabel('Email',{exact:true}).fill('synthetic@example.invalid');await page.getByLabel('Password',{exact:true}).fill('synthetic-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('unavailable to your account');expect(state.reads).toBe(0);expect(state.uploads).toBe(0);
  await page.goto('http://127.0.0.1:5177/?view=hosted&project=bad&report=bad');await expect(page.getByRole('alert')).toContainText('report link is invalid');expect(state.reads).toBe(0);
});

test('an unconfigured extension retains local import/export with all network connections blocked',async()=>{
  const folder=await mkdtemp(resolve('test-results/unconfigured-extension-'));
  const keys=['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'] as const;const old=keys.map((key)=>process.env[key]);
  try{for(const key of keys)process.env[key]='';await build({root:resolve('apps/extension'),configFile:resolve('apps/extension/vite.config.ts'),mode:'test',logLevel:'silent',build:{outDir:folder,emptyOutDir:true}});for(const file of ['content.js','page.js','replay.js','replay.css'])await copyFile(resolve('apps/extension/dist',file),join(folder,file));}
  finally{keys.forEach((key,index)=>{if(old[index]===undefined)delete process.env[key];else process.env[key]=old[index];});}
  const context=await launch(folder);try{
    const page=await context.newPage();await page.goto(`chrome-extension://${extensionIdAt(folder)}/review.html`);
    await page.locator('.review-sharing > summary').click();await expect(page.getByText('Hosted access is not configured.',{exact:false})).toBeVisible();
    await page.locator('input[type=file]').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await expect(page.getByRole('heading',{name:fixture.title,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Export report',exact:true})).toBeEnabled();
    const manifest=JSON.parse(await readFile(join(folder,'manifest.json'),'utf8'));expect(manifest.content_security_policy.extension_pages).toContain("connect-src 'none'");
  }finally{await context.close();}
});
