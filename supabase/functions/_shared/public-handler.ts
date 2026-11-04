import { parseReport, ReportValidationError } from './report.js';
import { bodyText, first, type Services } from './handler.ts';

export type PublicServices = Pick<Services,'rpc'|'upload'> & { intake: (key:string,origin:string)=>Promise<boolean> };
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failures:Record<string,[number,string]>={
  intake_unavailable:[403,'Website intake is unavailable for this key and origin.'],
  public_rate_limit:[429,'Website intake allows 10 attempts per hour. Retry later or export your report.'],
  public_report_limit:[429,'Website intake is full (20 reports). Contact the project owner or export your report.'],
  report_limit:[429,'The project owner must remove reports before more submissions can be accepted.'],
  busy:[409,'This report is still being saved. Retry after its 15-minute lease expires.'],
  report_conflict:[409,'A different version of this report was already submitted.'],
  not_found:[404,'This report is no longer available for submission.'],
  body_timeout:[408,'Reading the report timed out. Retry or export your report.'],
  invalid_body:[400,'Invalid request body.'],
};

export function createPublicHandler(services:PublicServices){
  return async(request:Request):Promise<Response>=>{
    const origin=request.headers.get('origin');const url=new URL(request.url);const key=url.searchParams.get('key');
    if(!origin||origin==='null'||!key||!uuid.test(key)||url.searchParams.size!==1)return Response.json({error:'A valid website key and origin are required.'},{status:403});
    // Origin checks constrain browsers, not callers that can forge HTTP headers.
    let allowed=false;try{allowed=await services.intake(key,origin);}catch{return Response.json({error:'Website intake could not be checked. Retry later.'},{status:503});}
    if(!allowed)return Response.json({error:failures.intake_unavailable![1]},{status:403});
    const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
    const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return json({error:'Public intake supports submissions only.'},405);
    try{
      await services.rpc('charge_public_ingest',{p_key:key,p_origin:origin});
      if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return json({error:'Submit an application/json report.'},415);
      const report=parseReport(await bodyText(request));
      if(report.formatVersion!==4||report.source.platform!=='web'||report.source.method!=='website-sdk')return json({error:'Current website SDK reports only.'},400);
      const text=JSON.stringify(report);const bytes=new TextEncoder().encode(text);
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map((byte)=>byte.toString(16).padStart(2,'0')).join('');
      const reserved=first(await services.rpc('begin_public_upload',{p_key:key,p_origin:origin,p_report:report.id,p_title:report.title,p_hash:hash,p_size:bytes.byteLength}));
      if(!reserved||reserved.report_id.toLowerCase()!==report.id.toLowerCase())throw new Error('invalid_server_row');
      if(reserved.lifecycle==='ready')return json({accepted:true,receipt:report.id});
      if(reserved.lifecycle!=='pending'||!reserved.lease_id)throw new Error('invalid_server_row');
      await services.upload(reserved.storage_path,text);
      const ready=first(await services.rpc('complete_upload',{p_owner:reserved.owner_id,p_id:reserved.id,p_lease:reserved.lease_id}));
      if(!ready||ready.id!==reserved.id||ready.owner_id!==reserved.owner_id||ready.lifecycle!=='ready')throw new Error('busy');
      return json({accepted:true,receipt:report.id},201);
    }catch(error){
      if(error instanceof ReportValidationError)return json({error:error.message},error.code==='too-large'?413:400);
      const known=failures[error instanceof Error?error.message:''];
      return known?json({error:known[1]},known[0]):json({error:'Submission did not finish. Your local report is unchanged. Retry later or export it.'},503);
    }
  };
}
