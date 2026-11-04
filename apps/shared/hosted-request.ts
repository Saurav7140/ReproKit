import type { SupabaseClient } from '@supabase/supabase-js';
import { prepareReportExport, type Report } from '@reprokit/core';

export class HostedAuthenticationError extends Error {
  constructor(){super('Sign in again. Your local report is unchanged.');}
}

export async function requestHosted(client: SupabaseClient | null, config: { url: string; key: string } | null, operation: 'upload' | 'read' | 'delete', id: string, report?: Report): Promise<unknown> {
  if (!client || !config) throw new Error('Configure hosted access first.');
  const content = report ? prepareReportExport(report).text : undefined;
  const request = async (refresh: boolean): Promise<Response> => {
    const session = refresh ? await client.auth.refreshSession() : await client.auth.getSession();
    if (session.error || !session.data.session) throw new HostedAuthenticationError();
    const endpoint = new URL(`${config.url}/functions/v1/reprokit`);
    endpoint.searchParams.set('op',operation); endpoint.searchParams.set(operation === 'upload' ? 'project' : 'id',id);
    return fetch(endpoint, { method: operation === 'upload' ? 'POST' : operation === 'delete' ? 'DELETE' : 'GET', body: content,
      headers: { Authorization: `Bearer ${session.data.session.access_token}`, apikey: config.key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30_000) });
  };
  try {
    let response = await request(false);
    if (response.status === 401) response = await request(true);
    if (response.status === 401) throw new HostedAuthenticationError();
    const result = await response.json() as { error?: unknown };
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Hosted operation failed. Your local report is unchanged.');
    return result;
  } catch (failure) {
    if (failure instanceof SyntaxError) throw new Error('Hosted response was invalid. Your local report is unchanged. Retry later.');
    if (failure instanceof TypeError || failure instanceof DOMException) throw new Error('Connection failed or timed out. Your local report is unchanged. Reconnect and retry.');
    throw failure;
  }
}
