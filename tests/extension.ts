import { expect, chromium, type BrowserContext, type CDPSession, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parseReport, type Report } from '../packages/core/src/report';

const extensionPath = resolve('apps/extension/dist');
const browserSessions=new WeakMap<BrowserContext,CDPSession>();
export const extensionIdAt = (path: string) => createHash('sha256').update(Buffer.from(path, process.platform === 'win32' ? 'utf16le' : 'utf8')).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, (digit) => String.fromCharCode(97 + parseInt(digit, 16)));
export const extensionId = extensionIdAt(extensionPath);
export async function launch(path = extensionPath, channel: 'chromium'|'chrome'|'msedge' = 'chromium') {
  // Branded Chrome/Edge need a native toolbar window for their action; bundled Chromium works headless.
  const context=await chromium.launchPersistentContext('', { channel, headless: channel==='chromium', acceptDownloads: true, ignoreDefaultArgs:['--disable-extensions'], args: [...(channel==='chromium'?[`--disable-extensions-except=${path}`,`--load-extension=${path}`]:[]), '--enable-unsafe-extension-debugging'] });
  if(channel!=='chromium'){
    try { const session=await context.browser()!.newBrowserCDPSession();await session.send('Extensions.loadUnpacked',{path});browserSessions.set(context,session); }
    catch(error){await context.close();throw error;}
  }
  return context;
}
export async function openCapture(context: BrowserContext, source: Page, grant = true, id = extensionId) {
  await source.bringToFront();
  const browserSession = browserSessions.get(context)??await context.browser()!.newBrowserCDPSession();
  const { targetInfos } = await browserSession.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }] });
  const target = targetInfos.find((info) => info.url === source.url());
  if (!target) throw new Error('Missing selected tab target');
  if(grant){
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{await Promise.race([browserSession.send('Extensions.triggerAction',{id,targetId:target.targetId}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Browser toolbar action timed out.')),15_000);})]);}
    finally{clearTimeout(timer);}
  }
  // Headless Chrome grants activeTab via the action; use its real popup document in a tab.
  const popup = await context.newPage(); await popup.goto(`chrome-extension://${id}/index.html`);
  await source.bringToFront();await expect(source.locator('[data-reprokit-ui]')).toHaveCount(0);
  const opened = context.waitForEvent('page');
  await popup.getByRole('button', { name: 'Start recording this tab' }).click();
  return opened;
}
export async function start(context: BrowserContext, source: Page, id = extensionId) {
  const review = await openCapture(context, source, true, id);
  await expect(review.locator('.notice')).toContainText('RECORDING selected tab', { timeout: 15_000 });
  await expect(source.locator('[data-reprokit-ui]')).toHaveCount(1);
  return review;
}
export async function reportFrom(review: Page): Promise<Report> {
  await review.getByText('Inspect report JSON', { exact: true }).click();
  return parseReport(await review.getByTestId('capture-json').innerText());
}
