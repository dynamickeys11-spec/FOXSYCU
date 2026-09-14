create or replace function public.enrich_mockdata_transaction_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare bank_name text; person_name text; person_last4 text; merchant_name text; merchant_category text; merchant_location text; rail text; kind_name text; description_text text; memo_text text; type_name text; category_name text; account_last4 text;
begin
  if coalesce(NEW.metadata->>'seed_source','') <> 'mockData-v1' or coalesce(NEW.metadata->>'institution_name','') <> '' then return NEW; end if;
  select a.account_number_last4 into account_last4 from public.accounts a where a.id=NEW.account_id;
  bank_name := (array['JPMorgan Chase Bank, N.A.','Bank of America, N.A.','Wells Fargo Bank, N.A.','Citibank, N.A.','U.S. Bank National Association','Capital One, N.A.'])[1 + mod(abs(hashtext(NEW.reference || ':bank')),6)];
  person_name := (array['Michael Carter','Lauren Mitchell','Daniel Brooks','Olivia Bennett','Marcus Reynolds','Christopher Hayes'])[1 + mod(abs(hashtext(NEW.reference || ':person')),6)];
  person_last4 := (array['4472','2816','6391','1048','7314','5269'])[1 + mod(abs(hashtext(NEW.reference || ':person')),6)];
  merchant_name := (array['Whole Foods Market','Costco Wholesale','Target','The Home Depot','Delta Air Lines','Marriott','Uber','Apple','Netflix','Shell'])[1 + mod(abs(hashtext(NEW.reference || ':merchant')),10)];
  merchant_category := (array['Groceries','Wholesale','Retail','Home Improvement','Airlines','Lodging','Transportation','Electronics','Entertainment','Fuel'])[1 + mod(abs(hashtext(NEW.reference || ':merchant')),10)];
  merchant_location := (array['Austin, TX','Austin, TX','Round Rock, TX','Austin, TX','Atlanta, GA','Austin, TX','Austin, TX','Austin, TX','Los Gatos, CA','Austin, TX'])[1 + mod(abs(hashtext(NEW.reference || ':merchant')),10)];
  if NEW.direction='credit' then
    rail:='ach'; type_name:='ACH_CREDIT'; kind_name:='Deposit'; category_name:=coalesce(nullif(NEW.metadata->>'category',''),'Income'); description_text:=case when NEW.status='pending' then 'ACH credit pending' when NEW.status='failed' then 'ACH credit failed' when NEW.status='reversed' then 'ACH credit reversed' else 'ACH credit received' end; memo_text:='ACH credit';
    NEW.transaction_type:=type_name; NEW.counterparty:=person_name; NEW.description:=description_text; NEW.memo:=memo_text; NEW.metadata:=jsonb_strip_nulls(coalesce(NEW.metadata,'{}'::jsonb)||jsonb_build_object('payment_rail',rail,'institution_name',bank_name,'account_last4',account_last4,'counterparty_details',jsonb_build_object('name',person_name,'accountLast4',person_last4),'ach_originator',person_name,'originator_account_last4',person_last4,'trace_number','0910'||right(abs(hashtext(NEW.reference))::text,12),'kind',kind_name,'category',category_name,'transaction_detail_version',2,'demo_data',true));
  elsif NEW.amount <= 2500 then
    rail:='card'; type_name:='CARD_PURCHASE'; kind_name:='Card Purchase'; category_name:=merchant_category; description_text:=case when NEW.status='pending' then merchant_name||' card authorization' when NEW.status='failed' then merchant_name||' card payment declined' when NEW.status='reversed' then merchant_name||' card payment reversed' else merchant_name||' card purchase' end; memo_text:=merchant_category||' purchase';
    NEW.transaction_type:=type_name; NEW.counterparty:=merchant_name; NEW.description:=description_text; NEW.memo:=memo_text; NEW.metadata:=jsonb_strip_nulls(coalesce(NEW.metadata,'{}'::jsonb)||jsonb_build_object('payment_rail',rail,'institution_name',bank_name,'account_last4',account_last4,'merchant',merchant_name,'merchant_category',merchant_category,'merchant_location',merchant_location,'card_last4','4821','authorization_code','A'||right(abs(hashtext(NEW.reference))::text,6),'kind',kind_name,'category',category_name,'transaction_detail_version',2,'demo_data',true));
  else
    rail:=case when NEW.amount>=25000 then 'wire' when NEW.amount<=10000 then 'zelle' else 'internal_transfer' end; type_name:=case rail when 'wire' then 'WIRE_OUT' when 'zelle' then 'ZELLE_OUT' else 'TRANSFER' end; kind_name:=case rail when 'wire' then 'Wire' when 'zelle' then 'Zelle' else 'Transfer' end; category_name:=case rail when 'wire' then 'Wire transfer' when 'zelle' then 'Zelle transfer' else 'Account transfer' end; description_text:=case when NEW.status='pending' then kind_name||' to '||person_name||' pending' when NEW.status='failed' then kind_name||' to '||person_name||' failed' when NEW.status='reversed' then kind_name||' to '||person_name||' reversed' else kind_name||' to '||person_name end; memo_text:=case rail when 'wire' then 'Domestic wire transfer' when 'zelle' then 'Person-to-person transfer' else 'Account transfer' end;
    NEW.transaction_type:=type_name; NEW.counterparty:=person_name; NEW.description:=description_text; NEW.memo:=memo_text; NEW.metadata:=jsonb_strip_nulls(coalesce(NEW.metadata,'{}'::jsonb)||jsonb_build_object('payment_rail',rail,'institution_name',bank_name,'account_last4',account_last4,'counterparty_details',jsonb_build_object('name',person_name,'accountLast4',person_last4),'beneficiary_name',person_name,'beneficiary_account_last4',person_last4,'transfer_reference',NEW.reference,'kind',kind_name,'category',category_name,'transaction_detail_version',2,'demo_data',true));
  end if;
  return NEW;
end;
$$;

drop trigger if exists transactions_mockdata_enrichment on public.transactions;
create trigger transactions_mockdata_enrichment before insert or update of metadata,amount,direction,status,reference on public.transactions for each row execute function public.enrich_mockdata_transaction_row();
update public.transactions set metadata=metadata where metadata->>'seed_source'='mockData-v1' and coalesce(metadata->>'institution_name','')='';
revoke execute on function public.enrich_mockdata_transaction_row() from public, anon, authenticated;
