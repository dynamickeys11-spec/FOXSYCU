-- Build 3: Statements & Documents storage
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('customer-documents','customer-documents',false,10485760,array['application/pdf'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];

DO $$ BEGIN
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='customer documents upload own folder') then
  create policy "customer documents upload own folder" on storage.objects for insert to authenticated with check (bucket_id='customer-documents' and (storage.foldername(name))[1]=auth.uid()::text);
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='customer documents read own folder') then
  create policy "customer documents read own folder" on storage.objects for select to authenticated using (bucket_id='customer-documents' and (storage.foldername(name))[1]=auth.uid()::text);
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='customer documents delete own folder') then
  create policy "customer documents delete own folder" on storage.objects for delete to authenticated using (bucket_id='customer-documents' and (storage.foldername(name))[1]=auth.uid()::text);
 end if;
END $$;

alter table public.customer_documents enable row level security;
alter table public.statement_periods enable row level security;
