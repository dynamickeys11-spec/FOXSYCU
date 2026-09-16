-- FOXSYCU transfer authorization lifecycle hardening
-- Draft creation never changes balances. A source-account hold is created only after
-- the Transfer PIN is verified and an authorization token is issued.

create or replace function private.reserve_movement_reservation(p_account_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if p_amount is null or p_amount <= 0 then raise exception 'reservation amount must be positive'; end if;
  update public.accounts set reserved_balance=coalesce(reserved_balance,0)+p_amount, available_balance=coalesce(available_balance,0)-p_amount, updated_at=now()
  where id=p_account_id and status='active' and coalesce(available_balance,0)>=p_amount;
  if not found then raise exception 'insufficient available balance'; end if;
end;
$function$;

create or replace function public.create_money_movement(p_idempotency_key text,p_rail text,p_source_account_id uuid,p_beneficiary_id uuid,p_amount numeric,p_currency text default 'USD',p_memo text default null,p_scheduled_for timestamptz default null,p_metadata jsonb default '{}'::jsonb,p_destination_account_id uuid default null)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_user uuid:=auth.uid(); v_existing public.money_movement_requests; v_request public.money_movement_requests; v_fee numeric(20,2):=case when p_rail in('wire','international') then 15 else 0 end; v_available numeric; v_destination_user uuid; v_directory_id uuid; v_initial_status text; v_metadata jsonb:=coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('requires_transfer_security',p_rail<>'deposit','authorization_reserved',false);
begin
if v_user is null then raise exception 'authentication required'; end if;
if p_amount is null or p_amount<=0 then raise exception 'amount must be positive'; end if;
if upper(coalesce(p_currency,'USD'))<>'USD' then raise exception 'settlement currency must be USD'; end if;
if p_rail not in('internal','ach','wire','international','zelle_like','deposit') then raise exception 'unsupported rail'; end if;
if p_rail='internal' and p_destination_account_id is null then begin v_directory_id:=(p_metadata->>'directory_destination_id')::uuid; exception when others then v_directory_id:=null; end; if v_directory_id is null then raise exception 'recognized internal destination required'; end if; perform 1 from public.internal_transfer_directory where id=v_directory_id and status='active'; if not found then raise exception 'recognized internal destination required'; end if; end if;
if p_rail='deposit' and p_destination_account_id is null then raise exception 'destination account required'; end if;
if p_rail<>'deposit' and p_source_account_id is null then raise exception 'source account required'; end if;
if p_rail='international' and(p_beneficiary_id is not null or coalesce(p_metadata->>'directory_destination_id','')='') then raise exception 'recognized international destination required'; end if;
if p_rail in('ach','wire','zelle_like') and p_beneficiary_id is null then if nullif(trim(coalesce(p_metadata->>'recipient_name','')),'') is null then raise exception 'recipient name required'; end if; if p_rail in('ach','wire') then if coalesce(p_metadata->>'account_number','') !~ '^[0-9]{12}$' then raise exception '12-digit account number required'; end if; if coalesce(p_metadata->>'routing_number','') !~ '^[0-9]{9}$' then raise exception '9-digit routing number required'; end if; elsif lower(coalesce(p_metadata->>'email','')) !~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$' then raise exception 'valid recipient email required'; end if; end if;
select * into v_existing from public.money_movement_requests where user_id=v_user and idempotency_key=p_idempotency_key limit 1; if found then return jsonb_build_object('movement_id',v_existing.id,'reference',v_existing.reference,'status',v_existing.status,'fee',v_existing.fee,'idempotent',true); end if;
if p_source_account_id is not null then select available_balance into v_available from public.accounts where id=p_source_account_id and user_id=v_user and status='active' for update; if not found then raise exception 'source account not found'; end if; if v_available<p_amount+v_fee then raise exception 'insufficient available balance'; end if; end if;
if p_destination_account_id is not null then select user_id into v_destination_user from public.accounts where id=p_destination_account_id and status='active' and id<>p_source_account_id for update; if not found then raise exception 'destination account not found'; end if; end if;
if p_beneficiary_id is not null then perform 1 from public.beneficiaries where id=p_beneficiary_id and user_id=v_user and status='active' for update; if not found then raise exception 'beneficiary not found'; end if; end if;
v_initial_status:=case when p_rail='deposit' then 'processing' else 'pending' end;
insert into public.money_movement_requests(user_id,source_account_id,destination_account_id,beneficiary_id,rail,direction,amount,fee,currency,status,reference,idempotency_key,scheduled_for,description,metadata) values(v_user,p_source_account_id,p_destination_account_id,p_beneficiary_id,p_rail,case when p_rail='deposit' then 'credit' else 'debit' end,p_amount,v_fee,'USD',v_initial_status,private.next_movement_reference(p_rail),p_idempotency_key,p_scheduled_for,p_memo,v_metadata) returning * into v_request;
insert into public.money_movement_events(movement_id,user_id,event_type,status,payload) values(v_request.id,v_user,'created',v_request.status,jsonb_build_object('rail',p_rail,'amount',p_amount,'destination_account_id',p_destination_account_id,'destination_user_id',v_destination_user,'metadata',v_metadata,'authorization_required',p_rail<>'deposit','authorization_hold_created',false));
return jsonb_build_object('movement_id',v_request.id,'reference',v_request.reference,'status',v_request.status,'fee',v_request.fee,'idempotent',false);
end;$function$;

create or replace function private.reserve_transfer_token_hold() returns trigger language plpgsql security definer set search_path to '' as $function$
declare m public.money_movement_requests; v_total numeric;
begin
select * into m from public.money_movement_requests where id=new.movement_id and user_id=new.user_id for update; if not found then raise exception 'transfer not found'; end if;
if m.status in('completed','cancelled','failed','reversed') then raise exception 'This transfer cannot be authorized.'; end if;
v_total:=m.amount+m.fee;
if m.status='pending' then perform private.reserve_movement_reservation(m.source_account_id,v_total); update public.money_movement_requests set status='processing',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('authorization_reserved',true,'authorization_hold_created_at',now(),'authorization_hold_amount',v_total),updated_at=now() where id=m.id; insert into public.money_movement_events(movement_id,user_id,event_type,status,payload) values(m.id,m.user_id,'authorization_hold_created','processing',jsonb_build_object('amount',v_total,'expires_at',new.expires_at));
elsif not coalesce((m.metadata->>'authorization_reserved')::boolean,false) then raise exception 'authorization hold is missing'; end if;
return new;
end;$function$;

drop trigger if exists trg_reserve_transfer_token_hold on public.transfer_tokens;
create trigger trg_reserve_transfer_token_hold after insert on public.transfer_tokens for each row execute function private.reserve_transfer_token_hold();

create or replace function public.expire_transfer_authorizations() returns integer language plpgsql security definer set search_path to '' as $function$
declare t record; m public.money_movement_requests; n integer:=0; v_total numeric;
begin
for t in select id,user_id,movement_id,status from public.transfer_tokens where (status='pending' and expires_at<=now()) or status='failed' order by expires_at for update skip locked limit 200 loop
update public.transfer_tokens set status=case when status='pending' then 'expired' else status end,updated_at=now() where id=t.id and status in('pending','failed');
select * into m from public.money_movement_requests where id=t.movement_id for update;
if found and m.status='processing' and coalesce((m.metadata->>'authorization_reserved')::boolean,false) and not exists(select 1 from public.transfer_tokens newer where newer.movement_id=m.id and newer.status='pending' and newer.expires_at>now()) then
v_total:=m.amount+m.fee; perform private.release_movement_reservation(m.source_account_id,v_total);
update public.money_movement_requests set status='cancelled',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('authorization_reserved',false,'authorization_expired_at',now(),'cancellation_reason',case when t.status='failed' then 'authorization_attempt_limit' else 'authorization_expired' end),updated_at=now() where id=m.id and status='processing';
insert into public.money_movement_events(movement_id,user_id,event_type,status,payload) values(m.id,m.user_id,case when t.status='failed' then 'authorization_failed' else 'authorization_expired' end,'cancelled',jsonb_build_object('reason',case when t.status='failed' then 'maximum authorization attempts reached' else 'authorization token expired' end,'released_amount',v_total)); n:=n+1;
end if;
end loop; return n;
end;$function$;

create or replace function public.execute_money_movement(p_movement_id uuid) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare u uuid:=auth.uid(); m public.money_movement_requests; src uuid; dst uuid; sys uuid; entries jsonb; r jsonb; total numeric; v_directory_id uuid; v_internal_directory boolean:=false; v_authorized boolean:=false; v_reserved boolean:=false;
begin
if u is null then raise exception 'authentication required'; end if;
select * into m from public.money_movement_requests where id=p_movement_id and user_id=u for update; if not found then raise exception 'movement not found'; end if;
if m.status in('completed','cancelled','reversed') then return jsonb_build_object('movement_id',m.id,'status',m.status,'reference',m.reference); end if;
if m.scheduled_for is not null and m.scheduled_for>now() then raise exception 'movement is scheduled for later'; end if;
if coalesce((m.metadata->>'requires_transfer_security')::boolean,false) then if m.status<>'processing' then raise exception 'transfer authorization is pending'; end if; select exists(select 1 from public.transfer_tokens tt where tt.movement_id=m.id and tt.user_id=u and tt.status='verified' and tt.verified_at is not null) into v_authorized; if not v_authorized then raise exception 'transfer authorization required'; end if; v_reserved:=coalesce((m.metadata->>'authorization_reserved')::boolean,false); if not v_reserved then raise exception 'authorization hold is missing'; end if; end if;
if m.rail='internal' then begin v_directory_id:=(m.metadata->>'directory_destination_id')::uuid; exception when others then v_directory_id:=null; end; if v_directory_id is not null then perform 1 from public.internal_transfer_directory where id=v_directory_id and status='active'; if not found then raise exception 'internal directory destination not found'; end if; select id into src from public.ledger_accounts where account_id=m.source_account_id and user_id=u and status='active'; select id into sys from public.ledger_accounts where code='SYSTEM_CLEARING' and currency=m.currency and user_id is null and status='active'; if src is null or sys is null then raise exception 'internal clearing ledger account not initialized'; end if; entries:=jsonb_build_array(jsonb_build_object('ledger_account_id',src,'debit',0,'credit',m.amount),jsonb_build_object('ledger_account_id',sys,'debit',m.amount,'credit',0)); v_internal_directory:=true; else select id into src from public.ledger_accounts where account_id=m.source_account_id and user_id=u and status='active'; select la.id into dst from public.ledger_accounts la join public.accounts a on a.id=la.account_id where la.account_id=m.destination_account_id and a.status='active'; if src is null or dst is null then raise exception 'internal ledger account not initialized'; end if; entries:=jsonb_build_array(jsonb_build_object('ledger_account_id',dst,'debit',m.amount,'credit',0),jsonb_build_object('ledger_account_id',src,'debit',0,'credit',m.amount)); end if;
elsif m.rail='deposit' then select id into src from public.ledger_accounts where account_id=m.destination_account_id and user_id=u and status='active'; select id into sys from public.ledger_accounts where code='SYSTEM_CASH' and currency=m.currency and user_id is null and status='active'; if src is null or sys is null then raise exception 'deposit ledger account not initialized'; end if; entries:=jsonb_build_array(jsonb_build_object('ledger_account_id',src,'debit',m.amount,'credit',0),jsonb_build_object('ledger_account_id',sys,'debit',0,'credit',m.amount));
else select id into src from public.ledger_accounts where account_id=m.source_account_id and user_id=u and status='active'; select id into sys from public.ledger_accounts where code='SYSTEM_CLEARING' and currency=m.currency and user_id is null and status='active'; if src is null or sys is null then raise exception 'clearing ledger account not initialized'; end if; total:=m.amount+m.fee; entries:=jsonb_build_array(jsonb_build_object('ledger_account_id',src,'debit',0,'credit',total),jsonb_build_object('ledger_account_id',sys,'debit',total,'credit',0)); end if;
r:=public.post_double_entry('movement:'||m.id::text,m.reference,upper(m.rail)||'_MOVEMENT',m.currency,coalesce(m.description,'Money movement'),entries,jsonb_build_object('movement_id',m.id,'actor_user_id',u,'rail',m.rail,'metadata',m.metadata));
if m.source_account_id is not null and (m.rail='deposit' or v_reserved or not coalesce((m.metadata->>'requires_transfer_security')::boolean,false)) then perform private.release_movement_reservation(m.source_account_id,m.amount+m.fee); end if;
if m.rail='internal' and not v_internal_directory then update public.accounts set available_balance=available_balance+m.amount,posted_balance=posted_balance+m.amount,updated_at=now() where id=m.destination_account_id; end if;
update public.money_movement_requests set status='completed',executed_at=now(),journal_id=(r->>'journal_id')::uuid,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('authorization_reserved',false),updated_at=now() where id=m.id;
insert into public.money_movement_events(movement_id,user_id,event_type,status,payload) values(m.id,u,'completed','completed',r); perform private.sync_movement_transaction(m.id);
return jsonb_build_object('movement_id',m.id,'reference',m.reference,'status','completed','posting',r);
exception when others then
if m.id is not null and m.source_account_id is not null and coalesce((m.metadata->>'authorization_reserved')::boolean,false) then perform private.release_movement_reservation(m.source_account_id,m.amount+m.fee); update public.money_movement_requests set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('authorization_reserved',false) where id=m.id; end if;
update public.money_movement_requests set status='failed',updated_at=now() where id=p_movement_id and user_id=u and status not in('completed','reversed','cancelled');
insert into public.money_movement_events(movement_id,user_id,event_type,status,payload) values(p_movement_id,u,'failed','failed',jsonb_build_object('error',sqlerrm)); raise;
end;$function$;

do $$ declare jid bigint; begin select jobid into jid from cron.job where jobname='foxsycu-expire-transfer-authorizations' limit 1; if jid is not null then perform cron.unschedule(jid); end if; perform cron.schedule('foxsycu-expire-transfer-authorizations','* * * * *','select public.expire_transfer_authorizations();'); end $$;