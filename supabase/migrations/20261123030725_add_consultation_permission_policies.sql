create function private.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.user_roles as user_roles
    join private.roles_permission as role_grants on role_grants.role_id = user_roles.role_id
    join private.permissions as permissions on permissions.id = role_grants.permission_id
    where user_roles.user_id = (select auth.uid())
      and permissions.key = permission_key
  );
$$;

revoke all on function private.has_permission(text) from public, anon, authenticated;
grant execute on function private.has_permission(text) to authenticated;

revoke all on table public.consultations from public, anon, authenticated;
grant select on table public.consultations to authenticated;
grant insert (student_id, first_name, last_name, reason, scheduled_at)
  on table public.consultations to authenticated;
grant update (scheduled_at, status) on table public.consultations to authenticated;

create policy "Users can read consultations they have access to"
on public.consultations
for select
to authenticated
using (
  (select private.has_permission('consultations.read_all'))
  or (
    (select private.has_permission('consultations.read_own'))
    and student_id = (select auth.uid())
  )
);

create policy "Users can book their own consultations with permission"
on public.consultations
for insert
to authenticated
with check (
  (select private.has_permission('consultations.create_own'))
  and student_id = (select auth.uid())
);

create policy "Users can update their own consultations with permission"
on public.consultations
for update
to authenticated
using (
  (select private.has_permission('consultations.update_own'))
  and student_id = (select auth.uid())
)
with check (
  (select private.has_permission('consultations.update_own'))
  and student_id = (select auth.uid())
);
