create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text
);

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

create policy "Read own profile or profiles on visible bookings"
on public.profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.consultations
    where consultations.student_id = profiles.user_id
  )
);

create function private.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, first_name, last_name)
  values (
    new.id,
    case when jsonb_typeof(new.raw_user_meta_data -> 'first_name') = 'string'
      then nullif(trim(new.raw_user_meta_data ->> 'first_name'), '') end,
    case when jsonb_typeof(new.raw_user_meta_data -> 'last_name') = 'string'
      then nullif(trim(new.raw_user_meta_data ->> 'last_name'), '') end
  )
  on conflict (user_id) do update set
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name);
  return new;
end;
$$;

revoke all on function private.sync_user_profile() from public, anon, authenticated;

create trigger sync_user_profile
after insert or update of raw_user_meta_data on auth.users
for each row execute function private.sync_user_profile();

-- Older accounts may only have names on bookings.
insert into public.profiles (user_id, first_name, last_name)
select account.id,
  coalesce(case when jsonb_typeof(account.raw_user_meta_data -> 'first_name') = 'string'
    then nullif(trim(account.raw_user_meta_data ->> 'first_name'), '') end,
    nullif(trim(latest_booking.first_name), '')),
  coalesce(case when jsonb_typeof(account.raw_user_meta_data -> 'last_name') = 'string'
    then nullif(trim(account.raw_user_meta_data ->> 'last_name'), '') end,
    nullif(trim(latest_booking.last_name), ''))
from auth.users as account
left join lateral (
  select first_name, last_name
  from public.consultations
  where student_id = account.id
  order by created_at desc, id desc
  limit 1
) as latest_booking on true
on conflict (user_id) do nothing;

alter table public.consultations
  drop constraint consultations_student_id_fkey,
  add constraint consultations_student_id_fkey foreign key (student_id)
    references public.profiles (user_id) on delete cascade,
  drop column first_name,
  drop column last_name;

grant insert (student_id, reason, scheduled_at) on public.consultations to authenticated;
