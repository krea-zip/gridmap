import type { RequestEvent } from '@sveltejs/kit';
import { json,error } from '@sveltejs/kit';
import {officeAccess,officeBody,databaseError} from '$lib/server/office';
export async function GET(event: RequestEvent){const {db}=await officeAccess(event);const {data,error:problem}=await db.from('office_submissions').select('*').order('created_at',{ascending:false}).limit(250);databaseError(problem);return json(data,{headers:{'cache-control':'no-store'}});}
export async function POST(event: RequestEvent){
 const {db,user,role}=await officeAccess(event);const b=await officeBody(event);
 if(b.id){
  if(!['admin','publisher','reviewer'].includes(role))error(403,'Reviewer access is required.');
  if(!['submitted','clarification','accepted','declined'].includes(String(b.status)))error(400,'Select a valid response.');
  const {error:problem}=await db.from('office_submissions').update({status:b.status,response:String(b.response??'').slice(0,12000)}).eq('id',b.id);databaseError(problem);
 }else{
  const request=String(b.request??'').trim();if(!request||request.length>12000)error(400,'Describe the requested change in 12,000 characters or fewer.');
  const {error:problem}=await db.from('office_submissions').insert({author:user.id,department:String(b.department??''),course:String(b.course??''),term:String(b.term??''),request});databaseError(problem);
 }
 return json({ok:true});
}
