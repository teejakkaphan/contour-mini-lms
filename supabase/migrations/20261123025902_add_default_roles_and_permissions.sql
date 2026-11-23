insert into private.roles (name)
values ('student'), ('admin')
on conflict (name) do nothing;

insert into private.permissions (key)
values
  ('consultations.create_own'),
  ('consultations.read_own'),
  ('consultations.update_own'),
  ('consultations.read_all')
on conflict (key) do nothing;

insert into private.roles_permission (role_id, permission_id)
select roles.id, permissions.id
from (
  values
    ('student', 'consultations.create_own'),
    ('student', 'consultations.read_own'),
    ('student', 'consultations.update_own'),
    ('admin', 'consultations.read_all')
) as default_grants(role_name, permission_key)
join private.roles as roles on roles.name = default_grants.role_name
join private.permissions as permissions on permissions.key = default_grants.permission_key
on conflict (role_id, permission_id) do nothing;
