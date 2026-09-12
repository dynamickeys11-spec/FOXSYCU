create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  title text not null,
  description text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_user_created_idx on public.security_events(user_id, created_at desc);
alter table public.security_events enable row level security;
drop policy if exists security_events_select_own on public.security_events;
create policy security_events_select_own on public.security_events for select to authenticated using (user_id = auth.uid());

grant select on public.security_events to authenticated;

create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  device_type text not null default 'browser',
  user_agent text,
  last_seen_at timestamptz not null default now(),
  trusted boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trusted_devices_user_idx on public.trusted_devices(user_id, last_seen_at desc);
alter table public.trusted_devices enable row level security;
drop policy if exists trusted_devices_select_own on public.trusted_devices;
create policy trusted_devices_select_own on public.trusted_devices for select to authenticated using (user_id = auth.uid());
drop policy if exists trusted_devices_update_own on public.trusted_devices;
create policy trusted_devices_update_own on public.trusted_devices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, update on public.trusted_devices to authenticated;

create or replace function public.register_current_security_session(p_device_name text, p_device_type text, p_user_agent text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.trusted_devices(user_id, device_name, device_type, user_agent, trusted, last_seen_at)
  values (auth.uid(), coalesce(nullif(p_device_name,''),'Current browser'), coalesce(nullif(p_device_type,''),'browser'), p_user_agent, true, now())
  returning id into v_id;
  insert into public.security_events(user_id,event_type,severity,title,description,user_agent,metadata)
  values (auth.uid(),'session_registered','success','Security session established','A new browser session was registered for this customer.',p_user_agent,jsonb_build_object('device_id',v_id));
  return v_id;
end;
$$;
revoke all on function public.register_current_security_session(text,text,text) from anon;
grant execute on function public.register_current_security_session(text,text,text) to authenticated;

create or replace function public.revoke_trusted_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.trusted_devices set trusted=false, revoked_at=now() where id=p_device_id and user_id=auth.uid();
  if not found then raise exception 'Device not found'; end if;
  insert into public.security_events(user_id,event_type,severity,title,description,metadata)
  values (auth.uid(),'device_revoked','warning','Trusted device revoked','A trusted device was removed from the account.',jsonb_build_object('device_id',p_device_id));
end;
$$;
revoke all on function public.revoke_trusted_device(uuid) from anon;
grant execute on function public.revoke_trusted_device(uuid) to authenticated;

insert into public.security_events(user_id,event_type,severity,title,description,metadata)
select id,'security_controls_hardened','success','Security controls hardened','Build 4 security event tracking is active.',jsonb_build_object('build','4')
from public.profiles p
where not exists (select 1 from public.security_events e where e.user_id=p.id and e.event_type='security_controls_hardened');
