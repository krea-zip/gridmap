-- Shared academic-office drafts, access, review, publication and immutable history.
-- Public curriculum tables remain the published catalogue. Drafts and source sheets
-- are private and are never included in a student-facing release.
begin;
create table public.office_staff (
 email text primary key check(email=lower(email) and email ~ '^[^ @]+@[^ @]+\.[^ @]+$'),
 role text not null check(role in ('admin','publisher','reviewer','editor','contributor')),
 department text, active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.office_staff enable row level security;
create function public.office_role() returns text language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null then null
 when public.is_admin() then 'admin'
 else (select role from public.office_staff where email=lower(auth.jwt()->>'email') and active) end
$$;
revoke all on function public.office_role() from public;
grant execute on function public.office_role() to authenticated;
create policy office_staff_read on public.office_staff for select to authenticated using(public.office_role()='admin' or email=lower(auth.jwt()->>'email'));
create policy office_staff_manage on public.office_staff for all to authenticated using(public.office_role()='admin') with check(public.office_role()='admin');
revoke all on public.office_staff from public,anon,authenticated;
grant select,insert,update,delete on public.office_staff to authenticated;

create table public.office_workspace (
 singleton boolean primary key default true check(singleton),
 document jsonb not null check(jsonb_typeof(document)='object' and document->>'format'='1' and octet_length(document::text)<16000000),
 revision integer not null default 1,
 status text not null default 'draft' check(status in ('draft','submitted','approved','published')),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 published_release text,
 deployment_status text not null default 'not-requested',
 deployment_message text not null default ''
);
create table public.office_history (
 revision integer primary key, document jsonb not null, status text not null,
 action text not null, note text not null default '', actor uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table public.office_submissions (
 id uuid primary key default gen_random_uuid(), author uuid not null references auth.users(id),
 department text not null, course text not null default '', term text not null default '',
 request text not null check(char_length(request) between 1 and 12000),
 status text not null default 'submitted' check(status in ('submitted','clarification','accepted','declined')),
 response text not null default '', created_at timestamptz not null default now()
);
alter table public.office_workspace enable row level security;
alter table public.office_history enable row level security;
alter table public.office_submissions enable row level security;
revoke all on public.office_workspace,public.office_history,public.office_submissions from public,anon,authenticated;
grant select on public.office_workspace,public.office_history to authenticated;
create policy office_workspace_read on public.office_workspace for select to authenticated using(public.office_role() in ('admin','publisher','reviewer','editor'));
create policy office_history_read on public.office_history for select to authenticated using(public.office_role() in ('admin','publisher','reviewer','editor'));
grant select,insert on public.office_submissions to authenticated;
grant update(status,response) on public.office_submissions to authenticated;
create policy office_submissions_read on public.office_submissions for select to authenticated using(author=auth.uid() or public.office_role() in ('admin','publisher','reviewer','editor'));
create policy office_submissions_create on public.office_submissions for insert to authenticated with check(
 author=auth.uid() and status='submitted' and response='' and
 (public.office_role() in ('admin','publisher','reviewer','editor') or
 (public.office_role()='contributor' and department=(select department from public.office_staff where email=lower(auth.jwt()->>'email') and active)))
);
create policy office_submissions_review on public.office_submissions for update to authenticated using(public.office_role() in ('admin','publisher','reviewer')) with check(public.office_role() in ('admin','publisher','reviewer'));

create function public.office_save(p_document jsonb,p_revision integer,p_note text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare w public.office_workspace; n integer;
begin
 if public.office_role() not in ('admin','publisher','reviewer','editor') or public.office_role() is null then raise exception 'Staff editing access is required' using errcode='42501'; end if;
 if p_document->>'format' is distinct from '1' or jsonb_typeof(p_document->'curriculum'->'courses') is distinct from 'array' then raise exception 'Invalid office document'; end if;
 perform pg_advisory_xact_lock(920261102);
 select * into w from public.office_workspace for update;
 if coalesce(w.revision,0)<>p_revision then raise exception 'Another staff member saved changes. Reload the shared draft before saving.' using errcode='40001'; end if;
 n:=p_revision+1;
 insert into public.office_workspace(singleton,document,revision,updated_by) values(true,p_document,n,auth.uid())
 on conflict(singleton) do update set document=excluded.document,revision=n,status='draft',updated_by=auth.uid(),updated_at=now();
 insert into public.office_history(revision,document,status,action,note,actor) values(n,p_document,'draft','saved',left(p_note,2000),auth.uid());
 return (select to_jsonb(x)-'singleton' from public.office_workspace x);
end $$;
create function public.office_transition(p_revision integer,p_status text,p_note text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare w public.office_workspace; r text:=public.office_role();
begin
 if r is null or r='contributor' then raise exception 'Staff access is required' using errcode='42501'; end if;
 if p_status not in ('submitted','approved','draft') then raise exception 'Invalid review action'; end if;
 if p_status in ('approved','draft') and r not in ('reviewer','publisher','admin') then raise exception 'Reviewer access is required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(920261102);
 select * into w from public.office_workspace for update;
 if w.revision is distinct from p_revision then raise exception 'The draft changed. Reload it before reviewing.' using errcode='40001'; end if;
 if p_status='approved' and w.status<>'submitted' then raise exception 'Submit the draft for review first'; end if;
 update public.office_workspace set status=p_status,revision=revision+1,updated_by=auth.uid(),updated_at=now();
 insert into public.office_history(revision,document,status,action,note,actor) values(p_revision+1,w.document,p_status,p_status,left(p_note,2000),auth.uid());
 return (select to_jsonb(x)-'singleton' from public.office_workspace x);
end $$;

-- A publishing function receives the same saved revision that was reviewed.
-- It builds the public release from published catalogue tables and an explicit
-- allowlist of extensions. Office remarks, raw sheets and workflow data stay private.
create function public.office_publish(p_revision integer) returns text
language plpgsql security definer set search_path='' as $$
declare w public.office_workspace; snap jsonb; extended jsonb; release_id text; base_id text;
begin
 if public.office_role() not in ('admin','publisher') or public.office_role() is null then raise exception 'Publishing access is required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(920261102);
 select * into w from public.office_workspace for update;
 if w.revision is distinct from p_revision then raise exception 'The draft changed. Review the latest revision.' using errcode='40001'; end if;
 if w.status<>'approved' then raise exception 'Approve this revision before publishing'; end if;
 base_id:=public.import_curriculum(w.document->'curriculum',w.document->'descriptions');
 snap:=public.assemble_curriculum();
 select jsonb_agg(c || jsonb_strip_nulls(jsonb_build_object('admission',o->'admission','audit',o->'audit','notes',o->'notes')) order by i)
 into extended
 from jsonb_array_elements(snap->'courses') with ordinality t(c,i)
 join lateral (select x as o from jsonb_array_elements(w.document->'curriculum'->'courses') x where x->>'code'=c->>'code') source on true;
 snap:=snap || jsonb_build_object('courses',coalesce(extended,'[]'::jsonb),'descriptions',coalesce(w.document->'descriptions','{}'::jsonb))
 || jsonb_strip_nulls(jsonb_build_object('policies',w.document->'curriculum'->'policies','creditSharing',w.document->'curriculum'->'creditSharing'));
 release_id:=left(md5(snap::text),12);
 insert into public.curriculum_releases(id,snapshot,published_by) values(release_id,snap||jsonb_build_object('release',release_id),auth.uid()) on conflict(id) do nothing;
 update public.curriculum_releases set is_current=false where is_current and id<>release_id;
 update public.curriculum_releases set is_current=true where id=release_id;
 update public.office_workspace set status='published',revision=revision+1,published_release=release_id,updated_by=auth.uid(),updated_at=now(),deployment_status='pending',deployment_message='Waiting for website update';
 insert into public.office_history(revision,document,status,action,note,actor) values(p_revision+1,w.document,'published','published',release_id,auth.uid());
 return release_id;
end $$;
create function public.office_deployment(p_release text,p_status text,p_message text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if public.office_role() not in ('admin','publisher') or public.office_role() is null then raise exception 'Publishing access is required' using errcode='42501'; end if;
 if p_status not in ('requested','failed','not-configured') then raise exception 'Invalid deployment status'; end if;
 update public.office_workspace set deployment_status=p_status,deployment_message=left(p_message,2000) where published_release=p_release;
end $$;
revoke all on function public.office_save(jsonb,integer,text),public.office_transition(integer,text,text),public.office_publish(integer),public.office_deployment(text,text,text) from public,anon;
grant execute on function public.office_save(jsonb,integer,text),public.office_transition(integer,text,text),public.office_publish(integer),public.office_deployment(text,text,text) to authenticated;
commit;
