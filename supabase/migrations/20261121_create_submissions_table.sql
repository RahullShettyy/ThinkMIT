-- submissions table: stores PPT file submission metadata linked to teams
create table if not exists public.submissions (
  id              uuid primary key default gen_random_uuid(),
  reg_code        text not null references public.teams(reg_code) on delete cascade,
  filebase_key    text not null,          -- S3 object key in Filebase bucket
  filename        text not null,          -- original filename for display
  file_size_bytes bigint,                 -- file size for display
  content_type    text,                   -- MIME type
  submitted_at    timestamptz not null default now(),
  unique(reg_code)                        -- one submission per team
);

-- Enable RLS (no public policies - service role only, same pattern as teams)
alter table public.submissions enable row level security;

-- Index for fast lookup by reg_code
create index if not exists submissions_reg_code_idx on public.submissions (reg_code);
