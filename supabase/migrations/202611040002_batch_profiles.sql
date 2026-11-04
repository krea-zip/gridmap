-- a batch can change which programmes it may take (philosophy as a major from
-- 2027). those offers have to reach students, so they join the release's
-- allowlist; the office's notes and change log on the same record stay private
begin;

create or replace function public.office_publish(p_revision integer, p_actor text) returns text
language plpgsql security definer set search_path = '' as $$
declare w public.office_workspace; snap jsonb; extended jsonb; offers jsonb; release_id text; base_id text;
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
  if jsonb_typeof(w.document->'curriculum'->'batchProfiles') = 'array' then
    select jsonb_agg(jsonb_build_object('batch', p->'batch', 'offers', p->'offers') order by (p->>'batch')::integer)
    into offers
    from jsonb_array_elements(w.document->'curriculum'->'batchProfiles') p
    where p->'offers' is not null and p->'offers' <> '{}'::jsonb;
  end if;
  snap := snap || jsonb_build_object('courses', coalesce(extended, '[]'::jsonb), 'descriptions', coalesce(w.document->'descriptions', '{}'::jsonb))
    || jsonb_strip_nulls(jsonb_build_object('policies', w.document->'curriculum'->'policies', 'creditSharing', w.document->'curriculum'->'creditSharing', 'batchProfiles', offers));
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

commit;
