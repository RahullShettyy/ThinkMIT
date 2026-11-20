create extension if not exists pgcrypto;

-- Registration code sequence
create sequence if not exists team_reg_seq start 1;

create type team_status as enum
  ('submitted','under_review','shortlisted','selected','not_selected','withdrawn');

create table public.teams (
  id               uuid primary key default gen_random_uuid(),
  reg_code         text unique not null,
  submission_key   text unique,                     -- idempotency
  team_name        text not null,
  track_key        text not null,
  idea_title       text not null,
  problem          text not null,
  solution         text not null,
  uniqueness       text not null,
  impact           text not null,
  status           team_status not null default 'submitted',
  score            numeric(5,2),
  admin_notes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index teams_name_uq on public.teams (lower(team_name));

create table public.members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  position    smallint not null check (position between 1 and 3), -- 1 = Team Leader
  role_key    text not null,                                       -- business|innovation|technical
  name        text not null,
  usn         text not null,
  email       text not null,
  phone       text not null,
  programme   text,
  year        text,
  department  text,
  unique (team_id, position),
  unique (team_id, role_key)
);
create unique index members_usn_uq   on public.members (upper(usn));
create unique index members_email_uq on public.members (lower(email));

create table public.site_content (
  section     text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create table public.site_content_history (
  id          uuid primary key default gen_random_uuid(),
  section     text not null,
  value       jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists site_content_history_section_idx
  on public.site_content_history (section, created_at desc);

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;
create trigger teams_touch before update on public.teams
  for each row execute function public.touch_updated_at();

-- Security: lock everything; the app uses the service role on the server only.
alter table public.teams                enable row level security;
alter table public.members              enable row level security;
alter table public.site_content         enable row level security;
alter table public.site_content_history enable row level security;
-- (No public policies on purpose. Never expose these tables to the anon key.)

-- Atomic registration. Called ONLY from the server (service role).
create or replace function public.register_team(payload jsonb, p_submission_key text, p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid; v_code text; m jsonb; i int := 0;
begin
  -- idempotent retry
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
    insert into members (team_id, position, role_key, name, usn, email, phone,
                         programme, year, department)
    values (v_team_id, i, m->>'role_key', m->>'name', upper(m->>'usn'),
            lower(m->>'email'), m->>'phone', m->>'programme', m->>'year', m->>'department');
  end loop;
  return v_code;
end $$;
revoke all on function public.register_team(jsonb,text,text) from public, anon, authenticated;
grant execute on function public.register_team(jsonb,text,text) to service_role;

-- Storage bucket for uploads (public read, admin-only write)
insert into storage.buckets (id, name, public) values ('media','media',true)
on conflict (id) do update set public = true;

-- Bucket RLS policies: public read, server service-role/admin write
drop policy if exists "Public read media" on storage.objects;
create policy "Public read media"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "Admin write media" on storage.objects;
create policy "Admin write media"
  on storage.objects for insert
  with check (bucket_id = 'media');

drop policy if exists "Admin update media" on storage.objects;
create policy "Admin update media"
  on storage.objects for update
  using (bucket_id = 'media');

drop policy if exists "Admin delete media" on storage.objects;
create policy "Admin delete media"
  on storage.objects for delete
  using (bucket_id = 'media');

