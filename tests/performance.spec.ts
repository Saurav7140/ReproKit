import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {cpus,totalmem} from 'node:os';
import {LIMITS,parseReport} from '@reprokit/core';
import {launch,start,reportFrom} from './extension';

test('bounded synthetic page measures recorder startup, frame cost, stop and source heap',async()=>{
  test.setTimeout(60_000);const context=await launch();
  try{
    const source=await context.newPage();await source.goto('http://127.0.0.1:5174/');
    await source.setContent('<!doctype html><html><head><title>Recorder performance fixture</title></head><body><main>'+Array.from({length:80},(_,i)=>`<button data-testid="row-${i}">PERFORMANCE_PRIVATE_${i}</button>`).join('')+'</main></body></html>');
    const cdp=await context.newCDPSession(source);await cdp.send('Performance.enable');
    const heap=async()=>{await cdp.send('HeapProfiler.collectGarbage');return (await cdp.send('Performance.getMetrics')).metrics.find((metric)=>metric.name==='JSHeapUsedSize')!.value;};
    const work=()=>source.evaluate(async()=>{
      const frames:number[]=[];const rows=[...document.querySelectorAll('main button')];
      for(let round=0;round<30;round++){const before=performance.now();for(const row of rows){row.textContent=`PERFORMANCE_PRIVATE_${round}`;(row as HTMLElement).style.marginLeft=`${round%2}px`;}void document.body.offsetWidth;await new Promise(requestAnimationFrame);frames.push(performance.now()-before);}
      return frames;
    });
    await work();const baseline=await work();const beforeHeap=await heap();
    await source.evaluate(()=>{const tasks:number[]=[];Reflect.set(window,'reprokitLongTasks',tasks);const observer=new PerformanceObserver((list)=>tasks.push(...list.getEntries().map((entry)=>entry.duration)));observer.observe({type:'longtask'});Reflect.set(window,'reprokitTaskObserver',observer);});
    const begin=performance.now();const review=await start(context,source);const startupMs=performance.now()-begin;const recording=await work();const stop=performance.now();await review.getByRole('button',{name:'Stop recording',exact:true}).click();await expect(review.locator('.notice')).toContainText('Recording stopped');const stopMs=performance.now()-stop;const report=await reportFrom(review);
    const tasks=await source.evaluate(()=>{(Reflect.get(window,'reprokitTaskObserver') as PerformanceObserver).disconnect();return Reflect.get(window,'reprokitLongTasks') as number[];});
    const afterHeap=await heap();const percentile=(values:number[],fraction:number)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*fraction)-1]!;
    const result={fixture:'80 buttons, 30 frames changing all text/margins; one warm-up; unthrottled local Chromium',browser:context.browser()!.version(),cpu:cpus()[0]?.model,memoryGiB:Math.round(totalmem()/1024**3),baselineFrameMedianMs:percentile(baseline,.5),baselineFrameP95Ms:percentile(baseline,.95),recordingFrameMedianMs:percentile(recording,.5),recordingFrameP95Ms:percentile(recording,.95),startupMs,stopMs,longestSourceTaskMs:Math.max(0,...tasks),sourceHeapDeltaMiB:(afterHeap-beforeHeap)/1024**2,reportBytes:Buffer.byteLength(JSON.stringify(report))};
    await writeFile('docs/phase8-performance.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
    expect(report.timeline.at(-1)?.label).toBe('Recording ended: stopped');expect(result.reportBytes).toBeLessThanOrEqual(LIMITS.bytes);expect(result.recordingFrameP95Ms).toBeLessThan(250);expect(result.longestSourceTaskMs).toBeLessThan(2000);expect(result.stopMs).toBeLessThan(2000);expect(result.sourceHeapDeltaMiB).toBeLessThan(64);
  }finally{await context.close();}
});

test('oversized live DOM ends capture within the evidence limit instead of retaining an unbounded snapshot',async({page})=>{
  await page.goto('http://127.0.0.1:5179/');await page.evaluate(()=>{const container=document.createElement('section');for(let i=0;i<6000;i++){const child=document.createElement('p');child.textContent='OVERSIZE_DOM_PRIVATE';container.append(child);}document.body.append(container);});
  await page.getByRole('button',{name:'Report a problem',exact:true}).click();await page.getByRole('checkbox').check();const start=performance.now();await page.getByRole('button',{name:'Start recording',exact:true}).click();await expect(page.getByRole('heading',{name:'Review before submitting',exact:true})).toBeVisible();const endedMs=performance.now()-start;
  await page.getByText('Inspect report JSON',{exact:true}).click();const report=parseReport(await page.getByTestId('capture-json').innerText());expect(report.timeline.at(-1)?.label).toMatch(/evidence-limit|capture-error/);expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThanOrEqual(LIMITS.bytes);expect(endedMs).toBeLessThan(3000);console.log(`6000-node oversize DOM stopped in ${endedMs.toFixed(1)} ms`);
});

test('five-minute real-time SDK recording automatically stops and remains bounded',async({page})=>{
  test.setTimeout(330_000);await page.goto('http://127.0.0.1:5179/');let uploads=0;page.on('request',(request)=>{if(request.method()==='POST')uploads++;});
  await page.getByRole('button',{name:'Report a problem',exact:true}).click();await page.getByRole('checkbox').check();const started=Date.now();await page.getByRole('button',{name:'Start recording',exact:true}).click();
  await page.evaluate(()=>{let count=0;const timer=setInterval(()=>{if(!document.querySelector('[data-reprokit-recording]')){clearInterval(timer);return;}document.querySelector('h1')!.textContent=`ENDURANCE_PRIVATE_${++count}`;},1000);});
  await expect(page.getByText('Recording ended: duration-limit.',{exact:false})).toBeVisible({timeout:310_000});const elapsedMs=Date.now()-started;
  await page.getByText('Inspect report JSON',{exact:true}).click();const report=parseReport(await page.getByTestId('capture-json').innerText());expect(elapsedMs).toBeGreaterThanOrEqual(LIMITS.durationMs-1000);expect(elapsedMs).toBeLessThan(315_000);expect(Date.parse(report.capture.endedAt)-Date.parse(report.capture.startedAt)).toBeLessThanOrEqual(LIMITS.durationMs);expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThanOrEqual(LIMITS.bytes);expect(JSON.stringify(report)).not.toContain('ENDURANCE_PRIVATE');expect(uploads).toBe(0);await expect(page.locator('[data-reprokit-recording]')).toHaveCount(0);
  await writeFile('docs/phase8-endurance.json',JSON.stringify({browser:await page.evaluate(()=>navigator.userAgent),elapsedMs,reportDurationMs:Date.parse(report.capture.endedAt)-Date.parse(report.capture.startedAt),bytes:Buffer.byteLength(JSON.stringify(report)),timelineEvents:report.timeline.length,replayEvents:report.evidence.kind==='web'?report.evidence.replay?.length:0,endReason:'duration-limit',uploads},null,2)+'\n');
});
