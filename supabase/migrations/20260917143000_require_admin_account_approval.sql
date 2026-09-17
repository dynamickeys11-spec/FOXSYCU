alter table public.profiles add column if not exists approval_status text not null default 'approved';
alter table public.profiles add column if not exists approval_reviewed_at timestamptz;
alter table public.profiles add column if not exists approval_reviewed_by uuid;
alter table public.profiles add column if not exists approval_note text;

do $$ begin
  alter table public.profiles add constraint profiles_approval_status_check check (approval_status in ('pending','approved','rejected'));
exception when duplicate_object then null;
end $$;

update public.profiles set approval_status = 'approved' where approval_status is null;

create or replace function public.handle_new_user_pending()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id,full_name,preferred_name,phone,date_of_birth,address_line1,city,state_region,postal_code,country,occupation,employment_status,tier,currency,customer_since,profile_completed,approval_status)
  values (new.id,nullif(btrim(new.raw_user_meta_data->>'full_name'),''),nullif(btrim(new.raw_user_meta_data->>'preferred_name'),''),nullif(btrim(new.raw_user_meta_data->>'phone'),''),nullif(new.raw_user_meta_data->>'date_of_birth','')::date,nullif(btrim(new.raw_user_meta_data->>'address_line1'),''),nullif(btrim(new.raw_user_meta_data->>'city'),''),nullif(btrim(new.raw_user_meta_data->>'state_region'),''),nullif(btrim(new.raw_user_meta_data->>'postal_code'),''),coalesce(nullif(btrim(new.raw_user_meta_data->>'country'),''),'United States'),nullif(btrim(new.raw_user_meta_data->>'occupation'),''),nullif(btrim(new.raw_user_meta_data->>'employment_status'),''),'Customer','USD',null,false,'pending')
  on conflict (id) do update set full_name=excluded.full_name,preferred_name=excluded.preferred_name,phone=excluded.phone,date_of_birth=excluded.date_of_birth,address_line1=excluded.address_line1,city=excluded.city,state_region=excluded.state_region,postal_code=excluded.postal_code,country=excluded.country,occupation=excluded.occupation,employment_status=excluded.employment_status;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user_pending();

create or replace function public.protect_profile_approval_status()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  if coalesce(old.approval_status,'approved') is distinct from new.approval_status and not public.is_admin() then
    new.approval_status:=old.approval_status; new.approval_reviewed_at:=old.approval_reviewed_at; new.approval_reviewed_by:=old.approval_reviewed_by; new.approval_note:=old.approval_note;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_approval_status on public.profiles;
create trigger protect_profile_approval_status before update on public.profiles for each row execute function public.protect_profile_approval_status();

create or replace function public.admin_list_pending_applications()
returns table(id uuid,email text,full_name text,preferred_name text,phone text,date_of_birth date,address_line1 text,city text,state_region text,postal_code text,country text,occupation text,employment_status text,created_at timestamptz,approval_status text,approval_note text)
language plpgsql security definer set search_path='public' as $$
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  return query select p.id,u.email::text,p.full_name,p.preferred_name,p.phone,p.date_of_birth,p.address_line1,p.city,p.state_region,p.postal_code,p.country,p.occupation,p.employment_status,p.created_at,p.approval_status,p.approval_note from public.profiles p join auth.users u on u.id=p.id where p.approval_status='pending' order by p.created_at asc;
end;
$$;

create or replace function public.admin_get_pending_application_count()
returns integer language plpgsql stable security definer set search_path='public' as $$
begin
  if not public.is_admin() then return 0; end if;
  return (select count(*)::integer from public.profiles where approval_status='pending');
end;
$$;

create or replace function public.admin_set_application_status(p_user_id uuid,p_status text,p_note text default null)
returns public.profiles language plpgsql security definer set search_path='public' as $$
declare result public.profiles;
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if p_status not in ('approved','rejected') then raise exception 'invalid application status'; end if;
  update public.profiles set approval_status=p_status,approval_reviewed_at=now(),approval_reviewed_by=auth.uid(),approval_note=nullif(btrim(p_note),''),customer_since=case when p_status='approved' then coalesce(customer_since,current_date) else customer_since end,profile_completed=case when p_status='approved' then true else profile_completed end,updated_at=now() where id=p_user_id and approval_status='pending' returning * into result;
  if result.id is null then raise exception 'pending application not found'; end if;
  insert into public.audit_logs(user_id,action,resource_type,resource_id,metadata) values(p_user_id,'account_application_'||p_status,'profile',p_user_id,jsonb_build_object('note',nullif(btrim(p_note),''),'reviewed_by',auth.uid()));
  return result;
end;
$$;

grant execute on function public.admin_list_pending_applications() to authenticated;
grant execute on function public.admin_get_pending_application_count() to authenticated;
grant execute on function public.admin_set_application_status(uuid,text,text) to authenticated;
revoke execute on function public.admin_list_pending_applications() from anon;
revoke execute on function public.admin_get_pending_application_count() from anon;
revoke execute on function public.admin_set_application_status(uuid,text,text) from anon;

create or replace function public.customer_is_approved()
returns boolean language sql stable security invoker set search_path=public as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and approval_status='approved');
$$;

drop policy if exists accounts_self_insert on public.accounts;
create policy accounts_self_insert on public.accounts for insert to authenticated with check ((select auth.uid())=user_id and public.customer_is_approved());

drop policy if exists transactions_self_insert on public.transactions;
create policy transactions_self_insert on public.transactions for insert to authenticated with check ((select auth.uid())=user_id and public.customer_is_approved());

grant execute on function public.customer_is_approved() to authenticated;
revoke execute on function public.customer_is_approved() from anon;
