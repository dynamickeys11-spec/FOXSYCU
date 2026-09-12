create table if not exists public.card_service_requests (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, card_control_id uuid references public.card_controls(id) on delete set null, request_type text not null check (request_type in ('replacement','pin_change')), status text not null default 'open' check (status in ('open','processing','completed','cancelled')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists card_service_requests_user_created_idx on public.card_service_requests(user_id,created_at desc);
alter table public.card_service_requests enable row level security;
drop policy if exists card_service_requests_select_own on public.card_service_requests;
create policy card_service_requests_select_own on public.card_service_requests for select to authenticated using (user_id=auth.uid());
drop policy if exists card_service_requests_insert_own on public.card_service_requests;
create policy card_service_requests_insert_own on public.card_service_requests for insert to authenticated with check (user_id=auth.uid());