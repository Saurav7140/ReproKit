import { z } from 'zod';

export const projectNameSchema = z.string().trim().min(1).max(80);
export const projectSchema = z.object({ id: z.uuid(), name: projectNameSchema, created_at: z.iso.datetime({ offset: true }) });
export const reportStatusSchema = z.enum(['open','investigating','resolved']);
export const hostedReportSchema = z.object({
  id: z.uuid(), project_id: z.uuid(), report_id: z.uuid(), title: z.string().min(1).max(160),
  platform: z.enum(['web','desktop','mobile','device']), status: reportStatusSchema,
  lifecycle: z.enum(['pending','ready','deleting']), created_at: z.iso.datetime({ offset: true }),
  expires_at: z.iso.datetime({ offset: true }), lease_until: z.iso.datetime({ offset: true }).nullable(),
  size_bytes: z.number().int().min(1).max(5242880),
});
export type Project = z.infer<typeof projectSchema>;
export type HostedReport = z.infer<typeof hostedReportSchema>;
export const PROJECT_FIELDS = 'id,name,created_at';
export const REPORT_FIELDS = 'id,project_id,report_id,title,platform,status,lifecycle,created_at,expires_at,lease_until,size_bytes';

export const websiteIntakeSchema=z.object({project_id:z.uuid(),public_key:z.uuid(),origin:z.string().max(300),enabled:z.boolean()});
export function websiteOrigin(value:string):string{
  const url=new URL(value);
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname))||!/^https?:\/\/[a-z0-9][a-z0-9.-]*(?::\d{1,5})?$/.test(url.origin)||url.origin.length>300)throw new Error('Enter an HTTPS site origin, or HTTP on localhost/127.0.0.1, without a path.');
  return url.origin;
}

export function dashboardReportUrl(origin: string, project: string, report: string): string {
  const url = new URL(origin);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname))) throw new Error('Use a dashboard HTTPS origin, or HTTP on loopback.');
  const id = z.uuid();
  url.searchParams.set('view','hosted'); url.searchParams.set('project',id.parse(project)); url.searchParams.set('report',id.parse(report));
  return url.href;
}

export function readReportLink(search: string): { project: string; report: string } | null {
  const params = new URLSearchParams(search);
  if (!params.has('project') && !params.has('report')) return null;
  return z.object({ project: z.uuid(),report: z.uuid() }).parse({ project: params.get('project'),report: params.get('report') });
}

export function hostedConfiguration(url: string | undefined, key: string | undefined): { url: string; key: string } | null {
  if (!url && !key) return null;
  const invalid = () => new Error('Hosted setup requires a valid Supabase URL and public publishable/anon key. Secret or service-role keys must never use VITE_ variables.');
  if (!url || !key) throw invalid();
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw invalid(); }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/' || parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1','localhost'].includes(parsed.hostname))) throw invalid();
  let publicKey = key.startsWith('sb_publishable_') && key.length >= 24;
  if (key.startsWith('eyJ')) {
    try { publicKey = JSON.parse(atob(key.split('.')[1]!.replace(/-/g,'+').replace(/_/g,'/'))).role === 'anon'; } catch { throw invalid(); }
  }
  if (!publicKey) throw invalid();
  return { url: parsed.origin, key };
}
