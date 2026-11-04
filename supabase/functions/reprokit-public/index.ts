import { createClient } from '@supabase/supabase-js';
import { createPublicHandler } from '../_shared/public-handler.ts';

declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
const url=Deno.env.get('SUPABASE_URL');
const collection=Deno.env.get('SUPABASE_SECRET_KEYS');
const key=collection?JSON.parse(collection).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||typeof key!=='string'||!key)throw new Error('Missing public intake server configuration.');
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:AbortSignal.timeout(20_000)})}});
function result<T>(value:{data:T;error:{message:string}|null}){if(value.error)throw new Error(value.error.message);return value.data;}
Deno.serve(createPublicHandler({
  intake:async(key,origin)=>Boolean(result(await admin.from('website_intakes').select('project_id').eq('public_key',key).eq('origin',origin).eq('enabled',true).maybeSingle())),
  rpc:async(name,args)=>result(await admin.rpc(name,args)),
  upload:async(path,text)=>{result(await admin.storage.from('recordings').upload(path,new Blob([text],{type:'application/json'}),{contentType:'application/json',upsert:true}));},
}));
