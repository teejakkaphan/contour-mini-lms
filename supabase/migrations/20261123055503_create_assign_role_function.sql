create function public.assign_signup_role(
  target_user_id uuid,
  selected_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role_id bigint;
begin
  if selected_role is null or selected_role not in ('student', 'admin') then
    raise exception 'Invalid sign-up role';
  end if;

  select id into strict selected_role_id
  from private.roles
  where name = selected_role;

  -- Keep Student and Admin mutually exclusive for this sign-up flow.
  delete from private.user_roles as user_roles
  using private.roles as roles
  where user_roles.user_id = target_user_id
    and user_roles.role_id = roles.id
    and roles.name in ('student', 'admin')
    and roles.id <> selected_role_id;

  insert into private.user_roles (user_id, role_id)
  values (target_user_id, selected_role_id)
  on conflict (user_id, role_id) do nothing;
end;
$$;

revoke all on function public.assign_signup_role(uuid, text)
  from public, anon, authenticated;

grant execute on function public.assign_signup_role(uuid, text)
  to service_role;