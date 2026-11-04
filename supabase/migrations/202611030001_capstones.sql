-- A programme's capstone project (ProgrammeRequirements.capstone in
-- src/lib/curriculum/snapshot.ts). Department documents promise one that the
-- catalogue has no course code for, so it is a field of the programme, not a
-- course; the planner places a stand-in for it. Importing and assembling the
-- curriculum carry it through, so a push or an office publish keeps it.
alter table public.programmes
  add column capstone_credits numeric(5, 1) check (capstone_credits > 0),
  add column capstone_required boolean,
  add constraint capstone_complete check ((capstone_credits is null) = (capstone_required is null));

-- as in 202611010001_curriculum.sql, plus the programme's capstone when it has one
create or replace function public.assemble_curriculum() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'format', 1,
    'updatedOn', (select updated_on from public.curriculum_settings),
    'rules', (select rules from public.curriculum_settings),
    'subjects', (
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', s.id, 'label', s.label, 'short', s.short, 'majorable', s.majorable, 'hue', s.hue
      )) order by s.position), '[]') from public.subjects s),
    'courses', (
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'code', c.code,
        'title', c.title,
        'faculty', c.taught_as,
        'subject', c.subject_id,
        'subjects', (select jsonb_agg(cs.subject_id order by cs.position) from public.course_subjects cs where cs.course_code = c.code),
        'codes', (select jsonb_agg(cc.code order by cc.position) from public.course_codes cc where cc.course_code = c.code),
        'codesBySubject', coalesce((select jsonb_object_agg(cs.subject_id, cs.code) from public.course_subjects cs where cs.course_code = c.code), '{}'),
        'credits', c.credits,
        'pendingCredits', nullif(c.credits_pending, false),
        'required', c.flagged_required,
        'offered', to_jsonb(c.offered),
        'eligibleYears', to_jsonb(c.eligible_years),
        'prereqs', coalesce((select jsonb_agg(p.prerequisite_code order by p.position) from public.course_prerequisites p where p.course_code = c.code), '[]'),
        'share', c.credit_share,
        'retired', nullif(c.retired, false),
        'terms', to_jsonb(c.terms),
        'lecturers', coalesce((select jsonb_agg(cl.lecturer_id order by cl.position) from public.course_lecturers cl where cl.course_code = c.code), '[]')
      )) order by c.position), '[]') from public.courses c),
    'lecturers', (
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', l.id, 'name', l.name, 'email', l.email, 'position', l.title, 'office_hours', l.office_hours,
        'image_url', l.image_url, 'url', l.profile_url, 'date_of_joining', l.joined
      )) order by l.position), '[]') from public.lecturers l),
    'equivalences', jsonb_build_object(
      'substitutes', (
        select coalesce(jsonb_agg(g.codes order by g.group_id), '[]') from (
          select group_id, jsonb_agg(course_code order by position) codes from public.course_substitutes group by group_id) g),
      'covers', (
        select coalesce(jsonb_agg(jsonb_build_object('maths', maths_code, 'applied', applied_code) order by position), '[]')
        from public.course_covers),
      'transcriptOnly', (
        select coalesce(jsonb_agg(code order by position), '[]') from public.courses where transcript_only)),
    'requirementSets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', rs.id, 'name', rs.name, 'batches', to_jsonb(rs.batches),
        'programmes', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'subject', p.subject_id,
            'variant', p.variant,
            'credits', jsonb_build_object('total', p.total_credits, 'required', p.required_credits, 'elective', p.elective_credits),
            'required', coalesce((select jsonb_agg(pc.course_code order by pc.position) from public.programme_courses pc where pc.programme_id = p.id and pc.role = 'required'), '[]'),
            'picks', coalesce((select jsonb_agg(pc.course_code order by pc.position) from public.programme_courses pc where pc.programme_id = p.id and pc.role = 'pick'), '[]'),
            'electives', coalesce((select jsonb_agg(pc.course_code order by pc.position) from public.programme_courses pc where pc.programme_id = p.id and pc.role = 'elective'), '[]'),
            'choices', coalesce((
              select jsonb_agg(jsonb_build_object(
                'rule', ch.rule, 'pick', ch.pick,
                'courses', (select jsonb_agg(jsonb_build_object('code', o.course_code, 'title', o.title) order by o.position)
                            from public.programme_choice_options o where o.choice_id = ch.id)
              ) order by ch.position) from public.programme_choices ch where ch.programme_id = p.id), '[]'),
            'pathway', coalesce((
              select jsonb_agg(jsonb_build_object('year', pw.year, 'trim', pw.trimester, 'code', pw.course_code) order by pw.position)
              from public.programme_pathway pw where pw.programme_id = p.id), '[]')
          ) || case when p.capstone_credits is null then '{}'::jsonb else jsonb_build_object(
            'capstone', jsonb_build_object('credits', p.capstone_credits, 'required', p.capstone_required)) end
          order by p.position), '[]') from public.programmes p where p.set_id = rs.id)
      ) order by rs.position), '[]') from public.requirement_sets rs),
    'batchRules', (
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'batch', br.batch, 'subject', br.subject_id, 'variant', br.variant,
        'courses', coalesce((select jsonb_object_agg(bc.course_code, bc.verdict) from public.batch_rule_courses bc
                             where (bc.batch, bc.subject_id, bc.variant) = (br.batch, br.subject_id, br.variant)), '{}'),
        'requiredCredits', br.required_credits
      )) order by br.batch, br.subject_id collate "C", br.variant collate "C"), '[]') from public.batch_rules br)
  )
$$;

-- as in 202611010001_curriculum.sql, plus the programme's capstone
create or replace function public.import_curriculum(snapshot jsonb, descriptions jsonb default '{}') returns text
language plpgsql set search_path = '' as $$
begin
  -- API callers must be admins; trusted roles (service key, SQL editor) may
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'Only admins can import the curriculum' using errcode = '42501';
  end if;
  if snapshot ->> 'format' is distinct from '1' then
    raise exception 'Unsupported curriculum format: %', snapshot ->> 'format';
  end if;

  delete from public.batch_rules where true;
  delete from public.requirement_sets where true;
  delete from public.course_lecturers where true;
  delete from public.lecturers where true;
  delete from public.course_covers where true;
  delete from public.course_substitutes where true;
  delete from public.course_prerequisites where true;
  delete from public.course_subjects where true;
  delete from public.course_codes where true;
  delete from public.courses where true;
  delete from public.subjects where true;

  insert into public.curriculum_settings (singleton, updated_on, rules)
  values (true, (snapshot ->> 'updatedOn')::date, snapshot -> 'rules')
  on conflict (singleton) do update set updated_on = excluded.updated_on, rules = excluded.rules;

  insert into public.subjects (id, label, short, majorable, hue, position)
  select s ->> 'id', s ->> 'label', s ->> 'short', (s ->> 'majorable')::boolean, (s ->> 'hue')::smallint, i
  from jsonb_array_elements(snapshot -> 'subjects') with ordinality t (s, i);

  insert into public.courses (code, position, title, subject_id, credits, credits_pending, flagged_required,
    offered, eligible_years, terms, taught_as, credit_share, transcript_only, retired, description)
  select c ->> 'code', i, c ->> 'title', c ->> 'subject', (c ->> 'credits')::numeric,
    coalesce((c ->> 'pendingCredits')::boolean, false), (c ->> 'required')::boolean,
    array(select jsonb_array_elements_text(c -> 'offered')::smallint),
    array(select jsonb_array_elements_text(c -> 'eligibleYears')::smallint),
    array(select jsonb_array_elements_text(c -> 'terms')),
    coalesce(c ->> 'faculty', ''), c ->> 'share',
    (snapshot -> 'equivalences' -> 'transcriptOnly') ? (c ->> 'code'),
    coalesce((c ->> 'retired')::boolean, false), descriptions ->> (c ->> 'code')
  from jsonb_array_elements(snapshot -> 'courses') with ordinality t (c, i);

  insert into public.course_codes (code, course_code, position)
  select code, c ->> 'code', j
  from jsonb_array_elements(snapshot -> 'courses') c, jsonb_array_elements_text(c -> 'codes') with ordinality u (code, j);

  insert into public.course_subjects (course_code, subject_id, code, position)
  select c ->> 'code', subject, c -> 'codesBySubject' ->> subject, j
  from jsonb_array_elements(snapshot -> 'courses') c, jsonb_array_elements_text(c -> 'subjects') with ordinality u (subject, j);

  insert into public.course_prerequisites (course_code, prerequisite_code, position)
  select c ->> 'code', pre, j
  from jsonb_array_elements(snapshot -> 'courses') c, jsonb_array_elements_text(c -> 'prereqs') with ordinality u (pre, j);

  insert into public.course_substitutes (group_id, course_code, position)
  select g, code, j
  from jsonb_array_elements(snapshot -> 'equivalences' -> 'substitutes') with ordinality t (codes, g),
    jsonb_array_elements_text(codes) with ordinality u (code, j);

  insert into public.course_covers (maths_code, applied_code, position)
  select e ->> 'maths', e ->> 'applied', i
  from jsonb_array_elements(snapshot -> 'equivalences' -> 'covers') with ordinality t (e, i);

  insert into public.lecturers (id, position, name, email, title, office_hours, image_url, profile_url, joined)
  select l ->> 'id', i, l ->> 'name', coalesce(l ->> 'email', ''), coalesce(l ->> 'position', ''),
    coalesce(l ->> 'office_hours', ''), coalesce(l ->> 'image_url', ''), coalesce(l ->> 'url', ''), l ->> 'date_of_joining'
  from jsonb_array_elements(snapshot -> 'lecturers') with ordinality t (l, i);

  insert into public.course_lecturers (course_code, lecturer_id, position)
  select c ->> 'code', id, j
  from jsonb_array_elements(snapshot -> 'courses') c, jsonb_array_elements_text(c -> 'lecturers') with ordinality u (id, j);

  insert into public.requirement_sets (id, position, name, batches)
  select rs ->> 'id', i, rs ->> 'name',
    case when jsonb_typeof(rs -> 'batches') = 'array' then array(select jsonb_array_elements_text(rs -> 'batches')::smallint) end
  from jsonb_array_elements(snapshot -> 'requirementSets') with ordinality t (rs, i);

  insert into public.programmes (set_id, subject_id, variant, position, total_credits, required_credits, elective_credits,
    capstone_credits, capstone_required)
  select rs ->> 'id', p ->> 'subject', p ->> 'variant', j,
    (p -> 'credits' ->> 'total')::numeric, (p -> 'credits' ->> 'required')::numeric, (p -> 'credits' ->> 'elective')::numeric,
    (p -> 'capstone' ->> 'credits')::numeric, (p -> 'capstone' ->> 'required')::boolean
  from jsonb_array_elements(snapshot -> 'requirementSets') rs
    cross join lateral jsonb_array_elements(rs -> 'programmes') with ordinality u (p, j);

  insert into public.programme_courses (programme_id, role, course_code, position)
  select pr.id, list.role, code, k
  from jsonb_array_elements(snapshot -> 'requirementSets') rs
    cross join lateral jsonb_array_elements(rs -> 'programmes') p
    join public.programmes pr on (pr.set_id, pr.subject_id, pr.variant) = (rs ->> 'id', p ->> 'subject', p ->> 'variant')
    cross join (values ('required', 'required'), ('pick', 'picks'), ('elective', 'electives')) list (role, field)
    cross join lateral jsonb_array_elements_text(p -> list.field) with ordinality v (code, k);

  insert into public.programme_choices (programme_id, position, rule, pick)
  select pr.id, k, ch ->> 'rule', (ch ->> 'pick')::smallint
  from jsonb_array_elements(snapshot -> 'requirementSets') rs
    cross join lateral jsonb_array_elements(rs -> 'programmes') p
    join public.programmes pr on (pr.set_id, pr.subject_id, pr.variant) = (rs ->> 'id', p ->> 'subject', p ->> 'variant')
    cross join lateral jsonb_array_elements(p -> 'choices') with ordinality v (ch, k);

  insert into public.programme_choice_options (choice_id, position, course_code, title)
  select pc.id, m, o ->> 'code', o ->> 'title'
  from jsonb_array_elements(snapshot -> 'requirementSets') rs
    cross join lateral jsonb_array_elements(rs -> 'programmes') p
    join public.programmes pr on (pr.set_id, pr.subject_id, pr.variant) = (rs ->> 'id', p ->> 'subject', p ->> 'variant')
    cross join lateral jsonb_array_elements(p -> 'choices') with ordinality v (ch, k)
    join public.programme_choices pc on (pc.programme_id, pc.position) = (pr.id, k)
    cross join lateral jsonb_array_elements(ch -> 'courses') with ordinality w (o, m);

  insert into public.programme_pathway (programme_id, position, year, trimester, course_code)
  select pr.id, k, (s ->> 'year')::smallint, (s ->> 'trim')::smallint, s ->> 'code'
  from jsonb_array_elements(snapshot -> 'requirementSets') rs
    cross join lateral jsonb_array_elements(rs -> 'programmes') p
    join public.programmes pr on (pr.set_id, pr.subject_id, pr.variant) = (rs ->> 'id', p ->> 'subject', p ->> 'variant')
    cross join lateral jsonb_array_elements(p -> 'pathway') with ordinality v (s, k);

  insert into public.batch_rules (batch, subject_id, variant, required_credits)
  select (b ->> 'batch')::smallint, b ->> 'subject', b ->> 'variant', (b ->> 'requiredCredits')::numeric
  from jsonb_array_elements(snapshot -> 'batchRules') b;

  insert into public.batch_rule_courses (batch, subject_id, variant, course_code, verdict, position)
  select (b ->> 'batch')::smallint, b ->> 'subject', b ->> 'variant', e.key, e.value, row_number() over ()
  from jsonb_array_elements(snapshot -> 'batchRules') b, jsonb_each_text(b -> 'courses') e;

  return public.publish_curriculum();
end;
$$;
