create function private.assign_default_student_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_role_id bigint;
begin
  select id into strict student_role_id
  from private.roles
  where name = 'student';

  insert into private.user_roles (user_id, role_id)
  values (new.id, student_role_id)
  on conflict (user_id, role_id) do nothing;

  return new;
end;
$$;

revoke all on function private.assign_default_student_role()
  from public, anon, authenticated;

create trigger assign_default_student_role
after insert on auth.users
for each row
execute function private.assign_default_student_role();