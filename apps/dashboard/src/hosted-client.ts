import { createClient } from '@supabase/supabase-js';
import { hostedConfiguration, parseReport, type Report } from '@reprokit/core';
import { requestHosted } from '../../shared/hosted-request';

export const hostedConfig = hostedConfiguration(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const supabase = hostedConfig ? createClient(hostedConfig.url, hostedConfig.key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

export async function hostedRequest(operation: 'upload' | 'read' | 'delete', id: string, report?: Report): Promise<unknown> {
  return requestHosted(supabase,hostedConfig,operation,id,report);
}

export async function loadHostedReport(id: string): Promise<Report> {
  const result = await hostedRequest('read',id) as { url?: unknown };
  if (typeof result.url !== 'string' || new URL(result.url).origin !== hostedConfig?.url) throw new Error('Invalid hosted read URL.');
  const response = await fetch(result.url, { signal: AbortSignal.timeout(20_000), cache: 'no-store' });
  if (!response.ok || Number(response.headers.get('content-length')) > 5242880) throw new Error('Report read failed. Retry opening it.');
  const reader = response.body?.getReader(); if (!reader) throw new Error('Report body unavailable.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 5242880) { await reader.cancel(); throw new Error('Hosted report exceeds 5 MiB.'); } chunks.push(next.value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  return parseReport(new TextDecoder('utf-8',{ fatal: true }).decode(bytes));
}
