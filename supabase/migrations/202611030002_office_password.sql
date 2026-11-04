-- The academic office signs in with one shared password, which the website's
-- server checks. The server then calls these functions with the project's
-- secret key (the service_role), so the database trusts that key alone: no
-- per-person accounts or roles, and no approval step before publishing. The
-- name someone types at sign-in comes along for the history.
--
-- office_staff and office_submissions (per-person access, department
-- requests) are left in place, unused, so nothing already in them is lost.
begin;

alter table public.office_workspace add column updated_by_name text not null default '';
alter table public.office_history add column actor_name text not null default '';

drop function public.office_save(jsonb, integer, text);
drop function public.office_transition(integer, text, text);
drop function public.office_publish(integer);
drop function public.office_deployment(text, text, text);

-- save the shared draft; the revision stops two people overwriting each other
create function public.office_save(p_document jsonb, p_revision integer, p_note text, p_actor text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare w public.office_workspace; n integer; who text := left(coalesce(p_actor, ''), 80);
begin
  if p_document->>'format' is distinct from '1' or jsonb_typeof(p_document->'curriculum'->'courses') is distinct from 'array' then
    raise exception 'Invalid office document';
  end if;
  perform pg_advisory_xact_lock(920261102);
  select * into w from public.office_workspace for update;
  if coalesce(w.revision, 0) <> p_revision then
    raise exception 'Someone else saved changes. Reload the shared draft before saving.' using errcode = '40001';
  end if;
  n := p_revision + 1;
  insert into public.office_workspace (singleton, document, revision, updated_by_name) values (true, p_document, n, who)
  on conflict (singleton) do update
    set document = excluded.document, revision = n, status = 'draft', updated_by = null, updated_by_name = who, updated_at = now();
  insert into public.office_history (revision, document, status, action, note, actor_name)
    values (n, p_document, 'draft', 'saved', left(coalesce(p_note, ''), 2000), who);
  return (select to_jsonb(x) - 'singleton' from public.office_workspace x);
end $$;

-- publish the saved revision as the new release. it builds the public release
-- from the catalogue tables and an explicit allowlist of extensions, so office
-- remarks, raw sheets and workflow data stay private
create function public.office_publish(p_revision integer, p_actor text) returns text
language plpgsql security definer set search_path = '' as $$
declare w public.office_workspace; snap jsonb; extended jsonb; release_id text; base_id text;
  who text := left(coalesce(p_actor, ''), 80);
begin
  perform pg_advisory_xact_lock(920261102);
  select * into w from public.office_workspace for update;
  if w.revision is distinct from p_revision then
    raise exception 'The draft changed. Reload it before publishing.' using errcode = '40001';
  end if;
  base_id := public.import_curriculum(w.document->'curriculum', w.document->'descriptions');
  snap := public.assemble_curriculum();
  select jsonb_agg(c || jsonb_strip_nulls(jsonb_build_object('admission', o->'admission', 'audit', o->'audit', 'notes', o->'notes')) order by i)
  into extended
  from jsonb_array_elements(snap->'courses') with ordinality t(c, i)
  join lateral (select x as o from jsonb_array_elements(w.document->'curriculum'->'courses') x where x->>'code' = c->>'code') source on true;
  snap := snap || jsonb_build_object('courses', coalesce(extended, '[]'::jsonb), 'descriptions', coalesce(w.document->'descriptions', '{}'::jsonb))
    || jsonb_strip_nulls(jsonb_build_object('policies', w.document->'curriculum'->'policies', 'creditSharing', w.document->'curriculum'->'creditSharing'));
  release_id := left(md5(snap::text), 12);
  insert into public.curriculum_releases (id, snapshot) values (release_id, snap || jsonb_build_object('release', release_id)) on conflict (id) do nothing;
  update public.curriculum_releases set is_current = false where is_current and id <> release_id;
  update public.curriculum_releases set is_current = true where id = release_id;
  update public.office_workspace
    set status = 'published', revision = revision + 1, published_release = release_id, updated_by = null, updated_by_name = who,
      updated_at = now(), deployment_status = 'pending', deployment_message = 'Waiting for website update';
  insert into public.office_history (revision, document, status, action, note, actor_name)
    values (p_revision + 1, w.document, 'published', 'published', release_id, who);
  return release_id;
end $$;

-- how the website rebuild for a release went
create function public.office_deployment(p_release text, p_status text, p_message text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('requested', 'failed', 'not-configured') then raise exception 'Invalid deployment status'; end if;
  update public.office_workspace set deployment_status = p_status, deployment_message = left(p_message, 2000)
    where published_release = p_release;
end $$;

revoke all on function public.office_save(jsonb, integer, text, text), public.office_publish(integer, text),
  public.office_deployment(text, text, text) from public, anon, authenticated;
grant execute on function public.office_save(jsonb, integer, text, text), public.office_publish(integer, text),
  public.office_deployment(text, text, text) to service_role;

commit;
