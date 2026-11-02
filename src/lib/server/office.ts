import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { makeOfficeDocument, type OfficeDocument, type OfficeRole } from '$lib/features/office/model';
import { documentShape, validateOffice } from '$lib/features/office/validation';
import snapshot from '$lib/data/curriculum.json';
import descriptions from '$lib/data/course-descriptions.json';
import type { CurriculumSnapshot } from '$lib/curriculum/snapshot';

// The office schema is isolated here until generated database types are refreshed.
export async function officeAccess(event: RequestEvent, roles?: OfficeRole[]) {
 const user=await event.locals.getUser();
 if(!event.locals.supabase)error(503,'The academic-office database is not connected.');
 if(!user)error(401,'Sign in with your staff account to open the academic office.');
 const db=event.locals.supabase as SupabaseClient;
 const {data:role,error:problem}=await db.rpc('office_role');
 if(problem)error(503,'The academic-office database needs its setup migration. Your existing catalogue is unchanged.');
 if(!role||roles&&!roles.includes(role))error(403,'Your account does not have access to this action.');
 return {db,user,role:role as OfficeRole};
}
export async function officeBody(event:RequestEvent):Promise<Record<string,unknown>>{
 const text=await event.request.text();
 if(new TextEncoder().encode(text).length>4_000_000)error(413,'This draft exceeds the 4 MB request limit. Export old source sheets and remove them from the draft before saving.');
 try {const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body;}catch {error(400,'The request could not be read.');}
}
export function databaseError(problem:{message:string;code?:string}|null){
 if(!problem)return;
 if(problem.code==='40001')error(409,problem.message);
 if(problem.code==='42501')error(403,'Your staff role cannot make this change.');
 error(400,problem.message);
}
export function checkedDocument(raw:unknown):OfficeDocument{
 if(!documentShape(raw))error(400,'This is not a valid academic-office document.');
 const issues=validateOffice(raw).filter(i=>i.severity==='error'&&i.area==='Workspace');
 if(issues.length)error(400,issues[0].message);
 return raw;
}
export async function initialOffice(db:SupabaseClient):Promise<OfficeDocument>{
 const {data,error:problem}=await db.from('curriculum_releases').select('snapshot').eq('is_current',true).maybeSingle();
 databaseError(problem);
 const published=data?.snapshot as CurriculumSnapshot & {descriptions?:Record<string,string>}|undefined;
 return makeOfficeDocument(published??snapshot as unknown as CurriculumSnapshot,published?.descriptions??descriptions);
}
export const officeRoles:OfficeRole[]=['admin','publisher','reviewer','editor'];
