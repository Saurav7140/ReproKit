import { createClient } from '@supabase/supabase-js';
import { createHandler } from '../_shared/handler.ts';
declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };

const required = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error(`Missing server setting: ${name}`); return value; };
const url = required('SUPABASE_URL');
const injectedKey = (collection: string,legacy: string) => {
  const value = Deno.env.get(collection);
  if (value) { try { const key = JSON.parse(value).default; if (typeof key === 'string' && key) return key; } catch { /* Never echo injected key contents. */ } throw new Error(`Missing default key in ${collection}`); }
  return required(legacy);
};
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000) }) } };
const auth = createClient(url, injectedKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'), options);
const admin = createClient(url, injectedKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY'), options);
const bucket = admin.storage.from('recordings');
function result<T>(value: { data: T; error: { message: string } | null }): T { if (value.error) throw new Error(value.error.message); return value.data; }

const origin = required('REPROKIT_DASHBOARD_ORIGIN');
const cleanupSecret = required('REPROKIT_CLEANUP_SECRET');
if (new URL(origin).origin !== origin || !/^https?:/.test(origin) || cleanupSecret.length<32) throw new Error('Invalid dashboard origin or cleanup-secret configuration.');
Deno.serve(createHandler({
  user: async (token) => { const { data, error } = await auth.auth.getUser(token); return error ? null : data.user.id; },
  rpc: async (name, args) => result(await admin.rpc(name, args)),
  find: async (owner, id) => result(await admin.from('reports').select('*').eq('owner_id', owner).eq('id', id).maybeSingle()),
  upload: async (path, text) => { result(await bucket.upload(path, new Blob([text], { type: 'application/json' }), { contentType: 'application/json', upsert: true })); },
  sign: async (path) => { const data = result(await bucket.createSignedUrl(path, 60)); return data!.signedUrl; },
  remove: async (path) => { result(await bucket.remove([path])); },
}, { origin, cleanupSecret }));
