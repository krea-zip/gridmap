-- Krea-only private saves; revocable links expose a separate, sanitised snapshot.
begin;

drop policy plans_select on public.plans;
drop policy plans_insert on public.plans;
drop policy plans_update on public.plans;
create policy plans_select on public.plans for select to authenticated
  using ((select auth.uid()) = user_id and (select public.can_review()));
create policy plans_insert on public.plans for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.can_review()));
create policy plans_update on public.plans for update to authenticated
  using ((select auth.uid()) = user_id and (select public.can_review()))
  with check ((select auth.uid()) = user_id and (select public.can_review()));

create table public.plan_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Shared plan' check (char_length(name) between 1 and 100),
  snapshot jsonb not null check (octet_length(snapshot::text) <= 256000),
  created_at timestamptz not null default now()
);
create index plan_shares_owner on public.plan_shares(user_id);
alter table public.plan_shares enable row level security;
revoke all on public.plan_shares from public, anon, authenticated;
grant select, delete on public.plan_shares to authenticated;
grant insert (user_id, snapshot) on public.plan_shares to authenticated;
create policy shares_select on public.plan_shares for select to authenticated
  using ((select auth.uid()) = user_id and (select public.can_review()));
create policy shares_insert on public.plan_shares for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.can_review()));
create policy shares_delete on public.plan_shares for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Do not allow arbitrary JSON fields (grades, emails, notes) into a public link,
-- even when someone bypasses the application and calls PostgREST directly.
create function private.sanitise_plan_share() returns trigger
language plpgsql set search_path = '' as $$
declare
  source jsonb := new.snapshot;
  placements jsonb;
  picks jsonb;
begin
  if source->>'version' <> '1' or jsonb_typeof(source->'placements') <> 'object'
     or jsonb_typeof(source->'picks') <> 'object'
     or not (source ?& array['version','placements','picks']) then
    raise exception 'Invalid plan';
  end if;
  select coalesce(jsonb_object_agg(slot, codes), '{}'::jsonb) into placements from (
    select key as slot, (
      select coalesce(jsonb_agg(code), '[]'::jsonb) from jsonb_array_elements_text(
        case when jsonb_typeof(value) = 'array' then value else '[]'::jsonb end
      ) code where code ~ '^[A-Z]{2,8}[0-9]{3}[A-Z]?$'
    ) codes from jsonb_each(source->'placements') where key ~ '^[1-6]-[1-3]$'
  ) clean;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into picks
    from jsonb_each(source->'picks')
    where key in ('major1', 'major2', 'minor', 'conc') and jsonb_typeof(value) = 'string'
      and (value #>> '{}') ~ '^[a-zA-Z0-9_-]{1,60}$';
  new.snapshot := jsonb_build_object('version', 1, 'placements', placements, 'picks', picks);
  if jsonb_typeof(source->'fourYear') = 'boolean' then
    new.snapshot := new.snapshot || jsonb_build_object('fourYear', source->'fourYear');
  end if;
  if source->>'yearCount' ~ '^[3-6]$' then
    new.snapshot := new.snapshot || jsonb_build_object('yearCount', source->'yearCount');
  end if;
  if source->>'batchStartYear' ~ '^20[0-9]{2}$' then
    new.snapshot := new.snapshot || jsonb_build_object('batchStartYear', source->'batchStartYear');
  end if;
  if source->>'structure' ~ '^[a-zA-Z0-9_-]{1,40}$' then
    new.snapshot := new.snapshot || jsonb_build_object('structure', source->'structure');
  end if;
  if jsonb_typeof(source->'audited') = 'array' then
    new.snapshot := new.snapshot || jsonb_build_object('audited', (
      select coalesce(jsonb_agg(code), '[]'::jsonb) from jsonb_array_elements_text(source->'audited') code
      where code ~ '^[A-Z]{2,8}[0-9]{3}[A-Z]?$'
    ));
  end if;
  new.name := 'Shared plan';
  return new;
end;
$$;
revoke all on function private.sanitise_plan_share() from public;
create trigger sanitise_plan_share before insert on public.plan_shares
  for each row execute function private.sanitise_plan_share();

-- The random ID is a capability: no listing, no author identity, no edit access.
create function public.read_plan_share(share_id uuid)
returns table (name text, snapshot jsonb, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.name, s.snapshot, s.created_at from public.plan_shares s where s.id = share_id;
$$;
revoke all on function public.read_plan_share(uuid) from public;
grant execute on function public.read_plan_share(uuid) to anon, authenticated;
commit;
