create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  reason text not null,
  scheduled_at timestamptz not null,
  status text not null default 'incomplete'
    check (status in ('incomplete', 'complete', 'cancelled')),
  created_at timestamptz not null default now()
);

create index consultations_student_schedule_idx
  on public.consultations (student_id, scheduled_at);

alter table public.consultations enable row level security;