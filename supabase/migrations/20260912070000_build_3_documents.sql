-- Build 3: Statements & Documents storage
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('customer-documents','customer-documents',false,10485760,array['application/pdf'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];

create policy if not exists "customer documents upload own folder"
on storage.objects for insert to authenticated
with check (bucket_id='customer-documents' and (storage.foldername(name))[1]=auth.uid()::text);

create policy if not exists "customer documents read own folder"
on storage.objects for select to authenticated
using (bucket_id='customer-documents' and (storage.foldername(name))[1]=auth.uid()::text);

create policy if not exists "customer documents delete own folder"
on storage.objects for delete to authenticated
using (bucket_id='customer-documents' and (storage.foldername(name))[1]=auth.uid()::text);

alter table public.customer_documents enable row level security;
alter table public.statement_periods enable row level security;
