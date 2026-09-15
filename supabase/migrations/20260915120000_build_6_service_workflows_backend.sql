-- Service workflow backend: remote deposits, bill pay, service requests, check ordering,
-- notification preferences, and statement-period generation.
-- Applied to the connected Supabase project as migration build_6_service_workflows_backend.

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('mailed_check','loan_application','support_request')),
  account_id uuid null references public.accounts(id) on delete set null,
  amount numeric null check (amount is null or amount > 0),
  status text not null default 'submitted' check (status in ('submitted','processing','approved','declined','completed','cancelled')),
  reference text not null unique,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.check_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  quantity integer not null default 50 check (quantity in (50,100,200)),
  style text not null default 'standard',
  shipping_method text not null default 'standard',
  status text not null default 'submitted' check (status in ('submitted','processing','shipped','completed','cancelled')),
  reference text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_user_idx on public.service_requests(user_id, created_at desc);
create index if not exists check_orders_user_idx on public.check_orders(user_id, created_at desc);

alter table public.service_requests enable row level security;
alter table public.check_orders enable row level security;

create policy "service_requests_own" on public.service_requests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "check_orders_own" on public.check_orders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.submit_check_deposit(p_account_id uuid,p_amount numeric,p_front_document_path text,p_back_document_path text) returns jsonb language plpgsql set search_path=public as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_ref text;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_amount<=0 then raise exception 'Deposit amount must be greater than zero'; end if;
 if not exists(select 1 from accounts where id=p_account_id and user_id=v_user and status='active' and currency='USD') then raise exception 'Account is not eligible for deposit'; end if;
 if coalesce(trim(p_front_document_path),'')='' or coalesce(trim(p_back_document_path),'')='' then raise exception 'Both check images are required'; end if;
 v_ref:='CHK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 insert into check_deposits(user_id,account_id,amount,front_document_path,back_document_path,status,funds_available_at,reference) values(v_user,p_account_id,p_amount,p_front_document_path,p_back_document_path,'submitted',now()+interval '2 business days',v_ref) returning id into v_id;
 insert into notifications(user_id,title,body,notification_type) values(v_user,'Check deposit submitted','Your check deposit was submitted for review. Reference '||v_ref||'.','deposit');
 return jsonb_build_object('id',v_id,'reference',v_ref,'status','submitted');
end; $$;
grant execute on function public.submit_check_deposit(uuid,numeric,text,text) to authenticated;

create or replace function public.create_bill_payment(p_payee_id uuid,p_account_id uuid,p_amount numeric,p_scheduled_for date) returns jsonb language plpgsql set search_path=public as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_ref text;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_amount<=0 then raise exception 'Payment amount must be greater than zero'; end if;
 if not exists(select 1 from bill_payees where id=p_payee_id and user_id=v_user and status='active') then raise exception 'Payee not found'; end if;
 if not exists(select 1 from accounts where id=p_account_id and user_id=v_user and status='active' and currency='USD') then raise exception 'Account not found'; end if;
 v_ref:='BILL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 insert into bill_payments(user_id,payee_id,account_id,amount,scheduled_for,status,reference) values(v_user,p_payee_id,p_account_id,p_amount,coalesce(p_scheduled_for,current_date),'scheduled',v_ref) returning id into v_id;
 return jsonb_build_object('id',v_id,'reference',v_ref,'status','scheduled');
end; $$;
grant execute on function public.create_bill_payment(uuid,uuid,numeric,date) to authenticated;

create or replace function public.submit_service_request(p_request_type text,p_account_id uuid,p_amount numeric,p_details jsonb) returns jsonb language plpgsql set search_path=public as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_ref text;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_request_type not in ('mailed_check','loan_application','support_request') then raise exception 'Unsupported service request'; end if;
 if p_account_id is not null and not exists(select 1 from accounts where id=p_account_id and user_id=v_user) then raise exception 'Account not found'; end if;
 v_ref:='REQ-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 insert into service_requests(user_id,request_type,account_id,amount,status,reference,details) values(v_user,p_request_type,p_account_id,p_amount,'submitted',v_ref,coalesce(p_details,'{}'::jsonb)) returning id into v_id;
 return jsonb_build_object('id',v_id,'reference',v_ref,'status','submitted');
end; $$;
grant execute on function public.submit_service_request(text,uuid,numeric,jsonb) to authenticated;

create or replace function public.order_checks(p_account_id uuid,p_quantity integer,p_style text,p_shipping_method text) returns jsonb language plpgsql set search_path=public as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_ref text;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_quantity not in (50,100,200) then raise exception 'Invalid check quantity'; end if;
 if not exists(select 1 from accounts where id=p_account_id and user_id=v_user and status='active') then raise exception 'Account not found'; end if;
 v_ref:='CHKORD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 insert into check_orders(user_id,account_id,quantity,style,shipping_method,status,reference) values(v_user,p_account_id,p_quantity,coalesce(nullif(p_style,''),'standard'),coalesce(nullif(p_shipping_method,''),'standard'),'submitted',v_ref) returning id into v_id;
 return jsonb_build_object('id',v_id,'reference',v_ref,'status','submitted');
end; $$;
grant execute on function public.order_checks(uuid,integer,text,text) to authenticated;

create or replace function public.upsert_notification_preferences(p_push_enabled boolean,p_email_enabled boolean,p_sms_enabled boolean,p_low_balance boolean,p_large_purchase boolean,p_transfer_alerts boolean,p_security_alerts boolean) returns public.notification_preferences language plpgsql set search_path=public as $$
declare v_user uuid:=auth.uid(); v_row public.notification_preferences;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 insert into notification_preferences(user_id,push_enabled,email_enabled,sms_enabled,low_balance,large_purchase,transfer_alerts,security_alerts,updated_at) values(v_user,p_push_enabled,p_email_enabled,p_sms_enabled,p_low_balance,p_large_purchase,p_transfer_alerts,p_security_alerts,now()) on conflict(user_id) do update set push_enabled=excluded.push_enabled,email_enabled=excluded.email_enabled,sms_enabled=excluded.sms_enabled,low_balance=excluded.low_balance,large_purchase=excluded.large_purchase,transfer_alerts=excluded.transfer_alerts,security_alerts=excluded.security_alerts,updated_at=now() returning * into v_row;
 return v_row;
end; $$;
grant execute on function public.upsert_notification_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.generate_statement_period(p_account_id uuid,p_period_start date,p_period_end date) returns public.statement_periods language plpgsql set search_path=public as $$
declare v_user uuid:=auth.uid(); v_row public.statement_periods;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from accounts where id=p_account_id and user_id=v_user) then raise exception 'Account not found'; end if;
 insert into statement_periods(user_id,account_id,period_start,period_end,opening_balance,closing_balance,total_credits,total_debits,transaction_count,statement_number,status)
 select v_user,p_account_id,p_period_start,p_period_end,coalesce((select posted_balance_after from transactions where account_id=p_account_id and effective_date<p_period_start order by effective_date desc,created_at desc limit 1),0),coalesce((select posted_balance_after from transactions where account_id=p_account_id and effective_date<=p_period_end order by effective_date desc,created_at desc limit 1),0),coalesce((select sum(amount+fee) from transactions where account_id=p_account_id and direction='credit' and effective_date between p_period_start and p_period_end),0),coalesce((select sum(amount+fee) from transactions where account_id=p_account_id and direction='debit' and effective_date between p_period_start and p_period_end),0),(select count(*) from transactions where account_id=p_account_id and effective_date between p_period_start and p_period_end),'STM-'||to_char(p_period_end,'YYYYMM')||'-'||upper(substr(replace(p_account_id::text,'-',''),1,8)),'final'
 on conflict(statement_number) do update set opening_balance=excluded.opening_balance,closing_balance=excluded.closing_balance,total_credits=excluded.total_credits,total_debits=excluded.total_debits,transaction_count=excluded.transaction_count,generated_at=now() returning * into v_row;
 return v_row;
end; $$;
grant execute on function public.generate_statement_period(uuid,date,date) to authenticated;
