import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {createServer} from 'node:net';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {expect} from '@playwright/test';
import {parseReport} from '@reprokit/core';
import {launch,start,reportFrom} from '../tests/extension';

// Native branded toolbar actions stall under test-runner instrumentation; use isolated standalone profiles.
const servers:ChildProcess[]=[];const versions:{channel:string;version:string}[]=[];
async function serve(app:string,port:number){
  await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',()=>reject(new Error(`Port ${port} is occupied. Stop its dev server before this check.`)));probe.listen(port,'127.0.0.1',()=>probe.close(()=>resolve()));});
  const child=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:resolve(app),stdio:'ignore',windowsHide:true});servers.push(child);
  for(let i=0;i<120;i++){assert.equal(child.exitCode,null,`${app} preview exited`);try{if((await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(500)})).ok)return;}catch{}await new Promise(done=>setTimeout(done,250));}throw new Error(`${app} preview did not start`);
}
try{
  await serve('apps/dashboard',5173);await serve('apps/demo',5174);await serve('apps/sdk-demo',5176);
  for(const channel of ['chrome','msedge'] as const){
    const context=await launch(undefined,channel);
    context.setDefaultTimeout(15_000);
    try{
      const version=context.browser()!.version();console.log(`Checking ${channel} ${version}`);versions.push({channel,version});
      const source=await context.newPage();await source.goto('http://127.0.0.1:5174/?token=CHANNEL_PRIVATE_SECRET');
      const review=await start(context,source);await source.getByLabel('Email',{exact:true}).fill('CHANNEL_FORM_SECRET@example.invalid');await source.getByTestId('submit-order').click();await source.getByRole('button',{name:'Throw error',exact:true}).click();const failed=source.waitForResponse(response=>response.url().endsWith('/api/fail-fetch'));await source.getByRole('button',{name:'Fail fetch',exact:true}).click();await failed;
      await expect.poll(()=>source.evaluate(()=>performance.getEntriesByType('resource').some(entry=>entry.name.endsWith('/api/fail-fetch')))).toBe(true);
      await review.getByRole('button',{name:'Stop recording',exact:true}).click();const report=await reportFrom(review);assert(!/SYNTHETIC_|CHANNEL_|PRIVATE_/.test(JSON.stringify(report)));assert.equal(report.evidence.kind,'web');if(report.evidence.kind!=='web')throw new Error('Missing web evidence');assert(report.evidence.actions.length&&report.evidence.errors.length&&report.evidence.failedRequests.some(request=>request.status===503));
      const download=review.waitForEvent('download');await review.getByRole('button',{name:'Export report',exact:true}).click();const exported=await download;assert.equal(exported.suggestedFilename(),`${report.id}.reprokit.json`);
      const dashboard=await context.newPage();await dashboard.goto('http://127.0.0.1:5173/');await dashboard.locator('input[type=file]').setInputFiles({name:exported.suggestedFilename(),mimeType:'application/json',buffer:await readFile((await exported.path())!)});await dashboard.getByRole('button',{name:'Replay',exact:true}).click();await expect(dashboard.getByText('Replay paused',{exact:true})).toBeVisible();await dashboard.locator('.evidence-pane').scrollIntoViewIfNeeded();await dashboard.screenshot({path:`docs/screenshots/phase8-${channel}-replay.png`});await dashboard.getByRole('button',{name:'Reproduction',exact:true}).click();await expect(dashboard.getByLabel('Playwright source',{exact:true})).toHaveValue(/test\(/);
      const sample=await context.newPage();await sample.goto('http://127.0.0.1:5176/');await expect(sample.locator('[data-reprokit-recording]')).toHaveCount(0);await sample.getByRole('button',{name:'Report a problem',exact:true}).click();await expect(sample.getByRole('button',{name:'Start recording',exact:true})).toBeDisabled();await sample.getByRole('checkbox').check();await sample.getByRole('button',{name:'Start recording',exact:true}).click();await sample.getByTestId('submit-order').click();await sample.getByRole('button',{name:'Stop and review',exact:true}).click();await sample.getByText('Inspect report JSON',{exact:true}).click();assert.equal(parseReport(await sample.getByTestId('capture-json').innerText()).source.method,'website-sdk');await sample.reload();await expect(sample.locator('[data-reprokit-recording]')).toHaveCount(0);
      console.log(`${channel}: actual capture, masking, export/import, replay, reproduction and SDK consent passed.`);
    }finally{await context.close();}
  }
  await writeFile('docs/phase8-browsers.json',JSON.stringify(versions,null,2)+'\n');
}catch(error){console.error(error instanceof Error?error.message:'Supported browser check failed.');process.exitCode=1;}
finally{for(const server of servers)server.kill();}
