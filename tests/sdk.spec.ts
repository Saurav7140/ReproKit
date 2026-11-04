import { test,expect } from '@playwright/test';
import { parseReport } from '@reprokit/core';

const base='http://127.0.0.1:5179/';
test('website sample requires explicit consent, captures masked evidence, reviews/retries/submits without authentication',async({page})=>{
  let submissions=0;let captured='';
  await page.route('https://public-ui-test.supabase.co/**',async(route)=>{
    submissions++;captured=route.request().postData()!;expect(route.request().headers().authorization).toBeUndefined();
    const report=JSON.parse(captured);await route.fulfill({status:submissions===1?503:201,contentType:'application/json',body:JSON.stringify(submissions===1?{error:'Temporary failure. Your local report is unchanged.'}:{accepted:true,receipt:report.id})});
  });
  await page.addInitScript(()=>{
    const original=MutationObserver.prototype.observe;let observations=0;
    MutationObserver.prototype.observe=function(...args){observations++;return original.apply(this,args);};
    Object.defineProperty(window,'sdkObservations',{get:()=>observations});
  });
  await page.goto(base+'?PRIVATE_QUERY#PRIVATE_HASH');
  await expect(page.getByText('Nothing is recording.',{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>Reflect.get(window,'sdkObservations'))).toBe(0);
  await page.getByRole('button',{name:'Report a problem',exact:true}).click();
  await expect(page.getByRole('button',{name:'Start recording',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>Reflect.get(window,'sdkObservations'))).toBe(0);
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/screenshots/phase7-consent-${width}.png`,fullPage:true});}
  await page.setViewportSize({width:1440,height:900});await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(submissions).toBe(0);
  await page.getByRole('button',{name:'Report a problem',exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Start recording',exact:true}).click();
  await expect(page.locator('[data-reprokit-recording]')).toHaveCount(1);
  await page.getByLabel('Email',{exact:true}).fill('MUTATED_SDK_SECRET@example.invalid');await page.getByTestId('submit-order').click();
  await page.getByTestId('throw-error').click();const failed=page.waitForResponse((response)=>response.url().endsWith('/api/fail-fetch'));await page.getByTestId('fail-fetch').click();await failed;
  await expect.poll(()=>page.evaluate(()=>performance.getEntriesByType('resource').some((entry)=>entry.name.endsWith('/api/fail-fetch')))).toBe(true);
  await page.getByRole('button',{name:'Stop and review',exact:true}).click();await expect(page.locator('[data-reprokit-recording]')).toHaveCount(0);
  await page.getByText('Inspect report JSON',{exact:true}).click();const report=parseReport(await page.getByTestId('capture-json').innerText());
  expect(report.source.method).toBe('website-sdk');expect(report.evidence.kind).toBe('web');if(report.evidence.kind!=='web')throw new Error('No web evidence');
  expect(report.evidence.actions.some((event)=>event.locator.value==='submit-order')).toBe(true);expect(report.evidence.errors.length).toBeGreaterThan(0);expect(report.evidence.failedRequests.some((event)=>event.status===503)).toBe(true);expect(report.evidence.replay?.some((event)=>event.type===2)).toBe(true);
  expect(JSON.stringify(report)).not.toMatch(/SYNTHETIC_|MUTATED_|PRIVATE_|I consent|Review before submitting/);expect(submissions).toBe(0);
  await page.getByLabel('Report title',{exact:true}).fill('Website test report');await expect(page.getByRole('button',{name:'Submit report',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Save details',exact:true}).click();
  await page.getByRole('button',{name:'Replay',exact:true}).click();await expect(page.locator('iframe.replay-frame')).toBeVisible();
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/screenshots/phase7-review-${width}.png`,fullPage:true});}
  await page.getByRole('button',{name:'Submit report',exact:true}).click();await expect(page.getByText('Temporary failure.',{exact:false})).toBeVisible();await expect(page.getByRole('heading',{name:'Website test report',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Submit report',exact:true}).dblclick();await expect(page.getByRole('button',{name:'Submitted',exact:true})).toBeDisabled();expect(submissions).toBe(2);expect(JSON.parse(captured).title).toBe('Website test report');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export report',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.reprokit\.json$/);
  await page.getByRole('button',{name:'Discard local recording',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Discard recording',exact:true}).click();await expect(page.getByText('Nothing is recording.',{exact:false})).toBeVisible();await expect(page.getByTestId('capture-json')).toHaveCount(0);
});
test('SDK discard and reload never resume capture; indicator removal ends capture',async({page})=>{
  async function start(){await page.getByRole('button',{name:'Report a problem',exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Start recording',exact:true}).click();await expect(page.locator('[data-reprokit-recording]')).toHaveCount(1);}
  await page.goto(base);await start();await page.getByRole('button',{name:'Discard recording',exact:true}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await page.getByRole('dialog').getByRole('button',{name:'Discard recording',exact:true}).click();await expect(page.locator('[data-reprokit-recording]')).toHaveCount(0);await expect(page.locator('.report-viewer')).toHaveCount(0);
  await start();await page.evaluate(()=>document.querySelector('[data-reprokit-recording]')?.remove());await expect(page.getByText('Recording ended: indicator-removed.',{exact:false})).toBeVisible();await page.reload();await expect(page.locator('[data-reprokit-recording]')).toHaveCount(0);await expect(page.locator('.report-viewer')).toHaveCount(0);
});

test('missing Resource Timing status remains unsupported without interrupting other SDK evidence',async({page})=>{
  await page.addInitScript(()=>{Reflect.deleteProperty(PerformanceResourceTiming.prototype,'responseStatus');});
  await page.goto(base);await page.getByRole('button',{name:'Report a problem',exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Start recording',exact:true}).click();
  const failed=page.waitForResponse((response)=>response.url().endsWith('/api/fail-fetch'));await page.getByTestId('fail-fetch').click();await failed;
  await page.getByTestId('submit-order').click();await page.getByRole('button',{name:'Stop and review',exact:true}).click();await page.getByText('Inspect report JSON',{exact:true}).click();
  const report=parseReport(await page.getByTestId('capture-json').innerText());expect(report.capabilities.requests).toBe('unsupported');expect(report.timeline.at(-1)?.label).toBe('Recording ended: stopped');expect(report.evidence.kind==='web'&&report.evidence.failedRequests.length).toBe(0);expect(report.evidence.kind==='web'&&report.evidence.actions.length).toBeGreaterThan(0);
});
