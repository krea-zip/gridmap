import { makeOfficeDocument, publication, changesBetween, type OfficeDocument, type OfficeRole, type OfficeRevision, type StaffMember, type Submission } from './model';
import {validateOffice,documentShape} from './validation';
import {supabaseConfigured} from '$lib/infrastructure/supabase/config';
import type {CurriculumSnapshot} from '$lib/curriculum/snapshot';

export const OFFICE_CONTEXT=Symbol('academic-office');
const LOCAL_KEY='kcal-office-local-draft-v1';
export class Workspace {
 document=$state<OfficeDocument|null>(null);
 saved=$state<OfficeDocument|null>(null);
 baseline=$state<OfficeDocument|null>(null);
 revision=$state(0);status=$state('draft');role=$state<OfficeRole>('editor');department=$state('');
 mode=$state<'loading'|'cloud'|'local'|'locked'>('loading');busy=$state(false);message=$state('');error=$state('');
 conflict=$state(false);history=$state<OfficeRevision[]>([]);staff=$state<StaffMember[]>([]);submissions=$state<Submission[]>([]);
 deployment=$state('');release=$state('');term=$state('');
 issues=$derived(this.document?validateOffice(this.document):[]);
 errors=$derived(this.issues.filter(i=>i.severity==='error'));
 dirty=$derived(!!this.document&&JSON.stringify(this.document)!==JSON.stringify(this.saved));
 changes=$derived(this.document&&this.baseline?changesBetween(this.baseline,this.document):[]);
 canReview=$derived(['admin','publisher','reviewer'].includes(this.role));
 canPublish=$derived(this.mode==='cloud'&&['admin','publisher'].includes(this.role));
 canEdit=$derived(this.role!=='contributor');
 async request(path:string,body?:unknown){
  const response=await fetch(`/api/admin/${path}`,{credentials:'same-origin',...(body!==undefined?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
  const result=await response.json().catch(()=>({message:'The server response could not be read.'}));
  if(!response.ok){if(response.status===409)this.conflict=true;throw Error(result.message??'The request failed. Try again.');}return result;
 }
 async init(){
  this.mode='loading';this.error='';
  try{
   if(!supabaseConfigured()){
    const [{default:snapshot},{default:descriptions}]=await Promise.all([import('$lib/data/curriculum.json'),import('$lib/data/course-descriptions.json')]);
    const base=makeOfficeDocument(snapshot as unknown as CurriculumSnapshot,descriptions);
    let local:OfficeDocument|undefined;try{const raw=JSON.parse(localStorage.getItem(LOCAL_KEY)??'null');if(documentShape(raw))local=raw;}catch{/* report through local status, keep published seed */}
    this.document=local??base;this.baseline=structuredClone(base);this.saved=$state.snapshot(this.document);this.mode='local';this.role='admin';
    this.message='Local draft only. Connect Supabase to share, approve and publish.';
   }else{
    const data=await this.request('workspace');this.document=data.document;this.saved=structuredClone(data.document);this.baseline=structuredClone(data.document);
    this.revision=data.revision;this.status=data.status;this.role=data.role;this.department=data.department;this.deployment=data.deployment_message??'';this.release=data.published_release??'';this.mode='cloud';
    this.message=this.revision?`Shared draft · revision ${this.revision}`:'Start by saving the catalogue as a shared draft.';
   }
   this.term=this.document?.terms.find(t=>t.status!=='archived')?.id??this.document?.terms[0]?.id??'';this.conflict=false;
  }catch(e){this.mode='locked';this.error=e instanceof Error?e.message:'The workspace could not be opened.';}
 }
 async save(note='Updated academic records'){
  if(this.busy||!this.document||!this.canEdit)return false;this.busy=true;this.error='';
  try{
   const draft=$state.snapshot(this.document);
   if(this.mode==='local'){localStorage.setItem(LOCAL_KEY,JSON.stringify(draft));this.saved=draft;this.message='Draft saved on this computer. It has not been published.';}
   else{const data=await this.request('workspace',{document:draft,revision:this.revision,note});this.revision=data.revision;this.status=data.status;this.saved=draft;this.message=`Saved to Supabase · revision ${this.revision}`;}
   return true;
  }catch(e){this.error=e instanceof Error?e.message:'Could not save the draft.';return false;}finally{this.busy=false;}
 }
 async transition(status:string,note:string){
  if(this.mode!=='cloud'){this.error='Review and approval require the shared Supabase workspace.';return;}
  if(this.dirty){this.error='Save your changes before sending this draft for review.';return;}
  await this.run(async()=>{const data=await this.request('workspace',{action:'transition',status,revision:this.revision,note});this.revision=data.revision;this.status=data.status;this.message=`Draft ${status} · revision ${this.revision}`;});
 }
 async publish(retry=false){
  if(this.dirty&&!retry){this.error='Save and approve the changed draft before publishing.';return;}
  await this.run(async()=>{const data=await this.request('publish',{revision:this.revision,retry});this.release=data.release;this.deployment=data.message;this.message=data.message;if(!retry){this.status='published';this.revision++;this.baseline=this.document?$state.snapshot(this.document):null;}});
 }
 async run(action:()=>Promise<void>){if(this.busy)return;this.busy=true;this.error='';try{await action();}catch(e){this.error=e instanceof Error?e.message:'The action could not be completed.';}finally{this.busy=false;}}
 preview(){if(!this.document)return;try{sessionStorage.setItem('kcal-office-preview',JSON.stringify(publication($state.snapshot(this.document))));window.open('/?admin-preview=1','_blank');}catch{this.error='The preview could not be opened. Check browser storage permissions.';}}
 async loadHistory(){if(this.mode!=='cloud')return;await this.run(async()=>{this.history=await this.request('history');});}
 async restore(revision:number){await this.run(async()=>{const entry=await this.request(`history?revision=${revision}`);this.document=entry.document;this.message=`Revision ${revision} loaded as an unsaved draft. Review it, then save.`;});}
 async loadStaff(){if(this.mode!=='cloud')return;await this.run(async()=>{this.staff=await this.request('staff');});}
 async saveStaff(member:StaffMember){await this.run(async()=>{await this.request('staff',member);this.staff=await this.request('staff');this.message='Staff access saved. They can sign in with this account.';});}
 async loadSubmissions(){if(this.mode!=='cloud')return;await this.run(async()=>{this.submissions=await this.request('submissions');});}
 async submit(body:unknown){await this.run(async()=>{await this.request('submissions',body);this.submissions=await this.request('submissions');this.message='Department request saved.';});}
}
