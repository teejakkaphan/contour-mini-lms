create view public.current_user_permissions
with (security_barrier = true, security_invoker = false) as
select distinct permission.key as permission
from private.user_roles as assignment
join private.roles_permission as grant_row on grant_row.role_id = assignment.role_id
join private.permissions as permission on permission.id = grant_row.permission_id
where assignment.user_id = (select auth.uid());

revoke all on public.current_user_permissions from public, anon, authenticated;
grant select on public.current_user_permissions to authenticated;
