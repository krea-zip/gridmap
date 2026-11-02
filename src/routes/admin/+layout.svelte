<script lang="ts">
 import '../../app.scss';import './legacy.scss';import './admin.scss';
 import {onMount,setContext} from 'svelte';import type {Snippet} from 'svelte';import {page} from '$app/state';
 import {beforeNavigate} from '$app/navigation';
 import {Workspace,OFFICE_CONTEXT} from '$lib/features/office/workspace.svelte';import {account} from '$lib/features/auth/account.svelte';
 let {children}:{children:Snippet}=$props();const office=new Workspace();setContext(OFFICE_CONTEXT,office);
 const groups=[
  {title:'Daily work',links:[['','Overview'],['import','Upload spreadsheet'],['offerings','Terms & offerings'],['approvals','Approvals & requests']]},
  {title:'Catalogue',links:[['courses','Courses'],['faculty','Faculty'],['departments','Departments'],['crosslist','Cross-listing & substitutions']]},
  {title:'Academic rules',links:[['requirements','Degree requirements'],['batches','Batch requirements'],['rules','University policies'],['tree','Prerequisite map']]},
  {title:'Manage',links:[['changes','Review & publish'],['history','Change history'],['reports','Reports & downloads'],['settings','Office fields'],['staff','Staff access']]}
 ];
 let leaveConfirm=$state(false);let textSize=$state(false);
 onMount(()=>{void account.init();void office.init();const warn=(e:BeforeUnloadEvent)=>{if(office.dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);});
 beforeNavigate(({to,cancel})=>{if(to&&!to.url.pathname.startsWith('/admin')&&office.dirty&&!confirm('You have unsaved changes. Leave without saving them?'))cancel();});
 const here=(path:string)=>page.url.pathname.replace(/\/$/,'')===`/admin${path?'/'+path:''}`;
</script>
<svelte:head><title>Academic office · kcal</title><meta name="robots" content="noindex" /></svelte:head>
<div class="office-shell" class:large-text={textSize}>
 <aside class="office-nav"><a class="office-brand" href="/admin">kcal <span>academic office</span></a>
 <nav aria-label="Academic office navigation">{#each groups as group}<h2>{group.title}</h2>{#each group.links as [path,label]}{#if office.role!=='contributor'||path==='approvals'}<a href="/admin{path?'/'+path:''}" aria-current={here(path)?'page':undefined}>{label}</a>{/if}{/each}{/each}</nav>
 <div class="office-nav-foot"><button type="button" aria-pressed={textSize} onclick={()=>textSize=!textSize}>Aa · {textSize?'Standard text':'Larger text'}</button><a href="/">Student planner ↗</a></div></aside>
 <div class="office-body">
  <header class="office-toolbar">
   <div><b>{office.mode==='cloud'?'Shared workspace':office.mode==='local'?'Local workspace':'Academic office'}</b><span class="office-save-state" role="status">{office.busy?'Working…':office.dirty?'Unsaved changes':office.message||'Opening workspace…'}</span></div>
   <div class="office-actions">{#if office.document&&office.canEdit}<button onclick={()=>office.preview()}>Student preview</button><button class="primary" disabled={office.busy||office.conflict||!office.dirty&&office.revision>0} onclick={()=>office.save()}>Save draft</button>{/if}{#if account.user}<button onclick={async()=>{if(!office.dirty||confirm('Sign out and leave unsaved changes?')){await account.signOut();await office.init();}}}>Sign out</button>{/if}</div>
  </header>
  {#if office.mode==='local'}<div class="office-banner">This is a local draft. Shared saving, staff access and publishing become available when Supabase is configured.</div>{/if}
  {#if office.error}<div class="office-alert" role="alert">{office.error}{#if office.conflict}<p>Your unsaved work is still here. Download a backup before reloading the shared draft.</p><div class="office-actions"><button onclick={async()=>{const {download}=await import('$lib/features/office/spreadsheet');download('unsaved-office-draft.json',JSON.stringify(office.document),'application/json');}}>Download my draft</button><button onclick={()=>leaveConfirm=true}>Reload shared draft</button></div>{/if}</div>{/if}
  {#if leaveConfirm}<div class="office-confirm" role="alertdialog" aria-label="Reload shared draft"><p>Reloading replaces the unsaved draft on this screen. Have you downloaded anything you need to keep?</p><button onclick={()=>{leaveConfirm=false;void office.init();}}>Reload draft</button><button onclick={()=>leaveConfirm=false}>Keep editing</button></div>{/if}
  <main class="office-main adm">
   {#if office.mode==='loading'}<p role="status">Opening the academic office…</p>
   {:else if office.mode==='locked'}<section class="office-card"><h1>Staff sign-in</h1><p>Use an account that has been granted academic-office access.</p><button class="primary" disabled={account.busy} onclick={()=>account.signIn('/admin')}>Sign in with Google</button><button onclick={()=>office.init()}>Try again</button>{#if account.error}<p role="alert">{account.error}</p>{/if}</section>
   {:else if office.role==='contributor'&&!here('approvals')}<h1>Department submissions</h1><p>Submit course updates to the academic office and follow their review.</p><a class="button primary" href="/admin/approvals">Open department requests</a>
   {:else}{@render children()}{/if}
  </main>
 </div>
</div>
