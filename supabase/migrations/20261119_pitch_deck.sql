-- Migration: Add Pitch Deck Storage & Metadata columns to public.teams
-- Date: 2026-11-19
-- Purpose: Support direct Filebase S3 pitch deck uploads alongside existing link inputs

-- 1. Add pitch deck metadata columns if they do not exist
alter table public.teams
  add column if not exists ppt_url text,
  add column if not exists ppt_object_key text,
  add column if not exists ppt_filename text,
  add column if not exists ppt_size_bytes bigint,
  add column if not exists ppt_uploaded_at timestamptz;

-- 2. Index the object key for fast lookup and integrity
create index if not exists teams_ppt_object_key_idx on public.teams (ppt_object_key)
  where ppt_object_key is not null;

-- 3. Update atomic registration RPC function to save pitch deck metadata
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

  v_code := p_prefix || '-' || lpad(nextval('team_reg_seq')::text, 4, '0');

  insert into teams (
    reg_code,
    submission_key,
    team_name,
    track_key,
    idea_title,
    problem,
    solution,
    uniqueness,
    impact,
    reference_link,
    ppt_url,
    ppt_object_key,
    ppt_filename,
    ppt_size_bytes,
    ppt_uploaded_at
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
    payload->>'impact',
    nullif(payload->>'reference_link',''),
    nullif(payload->>'ppt_url',''),
    nullif(payload->>'ppt_object_key',''),
    nullif(payload->>'ppt_filename',''),
    case when (payload->>'ppt_size_bytes') is not null and (payload->>'ppt_size_bytes') != ''
         then (payload->>'ppt_size_bytes')::bigint
         else null end,
    case when (payload->>'ppt_uploaded_at') is not null and (payload->>'ppt_uploaded_at') != ''
         then (payload->>'ppt_uploaded_at')::timestamptz
         else null end
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

-- 4. Ensure restricted function execution privileges
revoke all on function public.register_team(jsonb,text,text) from public, anon, authenticated;
grant execute on function public.register_team(jsonb,text,text) to service_role;
