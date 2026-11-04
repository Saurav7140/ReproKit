import { navigateWorkspace, editReportDetails } from './workspace';
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import fixture from '../packages/core/fixtures/web-report.json' with {type:'json'};
import {LIMITS,parseReport} from '@reprokit/core';
import {launch,start,reportFrom} from './extension';

test('report versions 1–4 round-trip through the viewer and malformed imports preserve unsaved work',async({page})=>{
  await page.goto('http://127.0.0.1:5173/');
  for(const version of [1,2,3,4]){
    const report=parseReport(JSON.stringify({...fixture,formatVersion:version,title:`Compatibility v${version}`}));
    await page.locator('input[type=file]').setInputFiles({name:'version.reprokit.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(report))});
    if(version>1)await page.getByRole('dialog').getByRole('button',{name:'Replace report',exact:true}).click();
    await expect(page.getByRole('heading',{name:report.title,exact:true})).toBeVisible();const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export report',exact:true}).click();const file=await downloaded;expect(parseReport(await readFile((await file.path())!,'utf8'))).toEqual(report);
  }
  await editReportDetails(page);await page.getByLabel('Report title',{exact:true}).fill('Unsaved compatibility draft');
  for(const body of [Buffer.from('{'),Buffer.from(JSON.stringify({...fixture,formatVersion:99})),Buffer.from(JSON.stringify({...fixture,cookies:'IMPORT_PRIVATE_SECRET'})),Buffer.alloc(LIMITS.bytes+1,120),Buffer.from('{"formatVersion":4,"deep":'+ '['.repeat(90)+'0'+']'.repeat(90)+'}')]){
    await page.locator('input[type=file]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:body});await expect(page.getByRole('alert')).toContainText('current report is unchanged');await expect(page.getByLabel('Report title',{exact:true})).toHaveValue('Unsaved compatibility draft');await expect(page.getByRole('button',{name:'Export report',exact:true})).toBeDisabled();await expect(page.getByRole('alert')).not.toContainText('IMPORT_PRIVATE_SECRET');
  }
});

test('keyboard-only review and confirmations retain labels, modal focus and visible controls at narrow widths',async({page})=>{
  await page.goto('http://127.0.0.1:5173/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content',exact:true})).toBeFocused();await page.keyboard.press('Enter');
  await page.locator('input[type=file]').setInputFiles({name:'keyboard.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await expect(page.getByRole('heading',{name:fixture.title,exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Context',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Capture environment',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Remove report',exact:true}).focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');const cancel=dialog.getByRole('button',{name:'Cancel',exact:true});const remove=dialog.getByRole('button',{name:'Remove report',exact:true});await expect(cancel).toBeFocused();await page.keyboard.press('Tab');await expect(remove).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(cancel).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Remove report',exact:true})).toBeFocused();
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:900});await page.getByRole('button',{name:'Reproduction',exact:true}).focus();await page.keyboard.press('Enter');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const controls=await page.locator('.report-viewer button:visible,.report-viewer input:visible,.report-viewer textarea:visible').evaluateAll((elements)=>elements.map((element)=>({tag:element.tagName,label:element.getAttribute('aria-label')||((element as HTMLInputElement).labels?.[0]?.textContent)||element.textContent})));expect(controls.every((control)=>control.label?.trim())).toBe(true);
    await page.screenshot({path:`docs/screenshots/phase8-review-${width}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Remove report',exact:true}).focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');await expect(remove).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Import report',exact:true})).toBeFocused();
});

test('hostile same-session diagnostic floods remain bounded, masked and unable to issue privileged commands',async()=>{
  const context=await launch();
  try{
    const source=await context.newPage();await source.goto('http://127.0.0.1:5174/');await source.evaluate(()=>{window.addEventListener('message',(event)=>{if(event.data?.channel==='reprokit-diagnostic-v2')Reflect.set(window,'observedDiagnosticSession',event.data.sessionId);});});
    const review=await start(context,source);await source.getByRole('button',{name:'Throw error',exact:true}).click();await expect.poll(()=>source.evaluate(()=>typeof Reflect.get(window,'observedDiagnosticSession'))).toBe('string');
    await source.evaluate(()=>{
      const sessionId=Reflect.get(window,'observedDiagnosticSession');const send=(kind:string,event:unknown)=>window.postMessage({channel:'reprokit-diagnostic-v2',sessionId,kind,event},location.origin);
      for(let i=0;i<2000;i++)send('error',{atMs:0,type:'exception',message:'HOSTILE_MESSAGE_SECRET',stack:'HOSTILE_STACK_SECRET'});
      send('error',{atMs:0,type:'exception',message:'x'.repeat(9000)});send('upload',{project:'HOSTILE_PROJECT_SECRET',token:'HOSTILE_TOKEN_SECRET'});send('request',{atMs:0,transport:'fetch',method:'GET',url:'https://user:HOSTILE_CREDENTIAL_SECRET@example.invalid/private?token=HOSTILE_QUERY_SECRET',status:503,outcome:'http-error'});
    });
    await review.getByRole('button',{name:'Stop recording',exact:true}).click();const report=await reportFrom(review);expect(report.timeline.at(-1)?.label).toBe('Recording ended: stopped');expect(JSON.stringify(report)).not.toMatch(/HOSTILE_|SYNTHETIC_/);if(report.evidence.kind!=='web')throw new Error('Missing web evidence');expect(report.evidence.errors.length).toBeGreaterThan(0);expect(report.evidence.errors.length).toBeLessThanOrEqual(101);expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThanOrEqual(LIMITS.bytes);await expect(review.getByText('Connected as',{exact:false})).toHaveCount(0);
  }finally{await context.close();}
});
