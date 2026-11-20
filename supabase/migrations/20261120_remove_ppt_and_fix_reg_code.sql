-- Migration: Remove PPT submission fields and fix registration sequence
-- Date: 2026-11-20
-- Purpose:
-- 1. Reset registration number sequence to start from 1 (e.g. TMIT-001)
-- 2. Update atomic registration RPC function to format reg codes with 3-digit padding (TMIT-001) and remove PPT fields
-- 3. Drop PPT & reference link fields from public.teams

-- 1. Restart registration sequence at 1
alter sequence if exists public.team_reg_seq restart with 1;

-- 2. Update atomic registration RPC function
create or replace function public.register_team(payload jsonb, p_submission_key text, p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_code text;
  m jsonb;
  i int := 0;
begin
  -- Idempotent retry: return existing registration code if already submitted
  select reg_code into v_code from teams where submission_key = p_submission_key;
  if v_code is not null then return v_code; end if;

  v_code := case when p_prefix is not null and p_prefix != '' then p_prefix || '-' else '' end || lpad(nextval('team_reg_seq')::text, 3, '0');

  insert into teams (
    reg_code,
    submission_key,
    team_name,
    track_key,
    idea_title,
    problem,
    solution,
    uniqueness,
    impact
  )
  values (
    v_code,
    p_submission_key,
    payload->>'team_name',
    payload->>'track_key',
    payload->>'idea_title',
    payload->>'problem',
    payload->>'solution',
    payload->>'uniqueness',
    payload->>'impact'
  )
  returning id into v_team_id;

  for m in select * from jsonb_array_elements(payload->'members') loop
    i := i + 1;
    insert into members (
      team_id,
      position,
      role_key,
      name,
      usn,
      email,
      phone,
      programme,
      year,
      department
    )
    values (
      v_team_id,
      i,
      m->>'role_key',
      m->>'name',
      upper(m->>'usn'),
      lower(m->>'email'),
      m->>'phone',
      m->>'programme',
      m->>'year',
      m->>'department'
    );
  end loop;

  return v_code;
end $$;

revoke all on function public.register_team(jsonb,text,text) from public, anon, authenticated;
grant execute on function public.register_team(jsonb,text,text) to service_role;

-- 3. Drop unused indexes and columns from public.teams
drop index if exists public.teams_ppt_object_key_idx;

alter table public.teams
  drop column if exists reference_link,
  drop column if exists ppt_url,
  drop column if exists ppt_object_key,
  drop column if exists ppt_filename,
  drop column if exists ppt_size_bytes,
  drop column if exists ppt_uploaded_at;
