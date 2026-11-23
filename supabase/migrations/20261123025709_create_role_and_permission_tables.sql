create schema if not exists private;

create table private.roles (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table private.permissions (
  id bigint generated always as identity primary key,
  key text not null unique
);

create table private.roles_permission (
  role_id bigint not null references private.roles (id) on delete cascade,
  permission_id bigint not null references private.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create index roles_permission_permission_id_idx
  on private.roles_permission (permission_id);

create table private.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id bigint not null references private.roles (id) on delete cascade,
  primary key (user_id, role_id)
);

create index user_roles_role_id_idx on private.user_roles (role_id);

alter table private.roles enable row level security;
alter table private.permissions enable row level security;
alter table private.roles_permission enable row level security;
alter table private.user_roles enable row level security;

revoke all on table private.roles, private.permissions, private.roles_permission, private.user_roles
  from public, anon, authenticated;
