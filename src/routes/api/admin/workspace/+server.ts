import type { RequestEvent } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { officeAccess,officeBody,databaseError,checkedDocument,initialOffice,officeRoles } from '$lib/server/office';
import { validateOffice } from '$lib/features/office/validation';
export async function GET(event: RequestEvent){
 const {db,role,user}=await officeAccess(event);
 const {data:membership}=await db.from('office_staff').select('department').eq('email',user.email?.toLowerCase()??'').maybeSingle();
 if(role==='contributor')return json({role,department:membership?.department??'',document:await initialOffice(db),revision:0,status:'draft'},{headers:{'cache-control':'no-store'}});
 const {data,error:problem}=await db.from('office_workspace').select('*').maybeSingle();databaseError(problem);
 return json({role,department:membership?.department??'',...(data??{document:await initialOffice(db),revision:0,status:'draft'})},{headers:{'cache-control':'no-store'}});
}
export async function POST(event: RequestEvent){
 const {db}=await officeAccess(event,officeRoles);const body=await officeBody(event);
 const revision=Number(body.revision);if(!Number.isInteger(revision)||revision<0)error(400,'Reload the draft before saving.');
 const note=typeof body.note==='string'?body.note:'';
 if(body.action==='transition'){
  if(!['draft','submitted','approved'].includes(String(body.status)))error(400,'Unknown review action.');
  if(body.status!=='draft'){
   const {data,error:readError}=await db.from('office_workspace').select('document').maybeSingle();databaseError(readError);
   const issues=validateOffice(data?.document).filter(i=>i.severity==='error');if(issues.length)error(400,`Resolve ${issues.length} errors before submitting or approving. ${issues[0].message}`);
  }
  const {data,error:problem}=await db.rpc('office_transition',{p_revision:revision,p_status:body.status,p_note:note});databaseError(problem);return json(data);
 }
 const document=checkedDocument(body.document);
 const {data,error:problem}=await db.rpc('office_save',{p_document:document,p_revision:revision,p_note:note});databaseError(problem);return json(data);
}
