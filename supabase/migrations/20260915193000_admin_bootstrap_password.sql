alter table public.admin_roles add column if not exists must_change_password boolean not null default true;

create or replace function public.claim_bootstrap_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  insert into public.admin_roles(user_id, role, must_change_password)
  select auth.uid(), 'admin', true
  where auth.uid() is not null
    and lower(coalesce(auth.email(), '')) = 'fncumgt@gmail.com'
    and not exists (select 1 from public.admin_roles where user_id = auth.uid());
  select exists(select 1 from public.admin_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.complete_admin_password_change()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  update public.admin_roles
  set must_change_password = false
  where user_id = auth.uid() and role = 'admin';
  select exists(select 1 from public.admin_roles where user_id = auth.uid() and role = 'admin' and must_change_password = false);
$$;

grant execute on function public.claim_bootstrap_admin() to authenticated;
grant execute on function public.complete_admin_password_change() to authenticated;
