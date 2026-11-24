-- Local assessment account. Keep these public demo credentials out of hosted databases.
do $$
declare
  demo_admin_id constant uuid := 'f0b3ae15-d7c5-4d31-8794-0ab882ed9df4';
  demo_admin_email constant text := 'admin@admin.com';
  admin_role_id bigint;
begin
  select id into strict admin_role_id
  from private.roles
  where name = 'admin';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    demo_admin_id, 'authenticated', 'authenticated', demo_admin_email,
    extensions.crypt('123456', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Demo","last_name":"Admin"}'::jsonb,
    '', '', '', '', now(), now()
  ) on conflict (id) do nothing;

  if not exists (
    select 1 from auth.users where id = demo_admin_id and email = demo_admin_email
  ) then
    raise exception 'The demo admin UUID belongs to a different Auth account';
  end if;

  insert into auth.identities (
    user_id, provider_id, provider, identity_data, created_at, updated_at
  ) values (
    demo_admin_id, demo_admin_id::text, 'email',
    jsonb_build_object('sub', demo_admin_id::text, 'email', demo_admin_email, 'email_verified', true),
    now(), now()
  ) on conflict (provider_id, provider) do nothing;

  insert into private.user_roles (user_id, role_id)
  values (demo_admin_id, admin_role_id)
  on conflict (user_id, role_id) do nothing;

  delete from private.user_roles as assignment
  using private.roles as role
  where assignment.user_id = demo_admin_id
    and assignment.role_id = role.id
    and role.name = 'student';
end;
$$;
