create extension if not exists pgcrypto;

create table if not exists public.inventory_items (
  id bigint primary key,
  name text,
  category text,
  tab_category text,
  device_type text,
  campus text,
  office_type text,
  department text,
  user_type text,
  year_purchased text,
  usage text,
  processor text,
  ram text,
  os text,
  storage text,
  storage_extra text,
  asset_tag text,
  assigned_user text,
  status text default 'Functional',
  remarks text,
  quantity integer default 1,
  serial_number text,
  date_added text,
  notes text,
  sheet_row integer,
  sheet_tab text,
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists inventory_items_sheet_unique
  on public.inventory_items (sheet_tab, sheet_row)
  where sheet_tab is not null and sheet_row is not null;

create index if not exists inventory_items_category_idx
  on public.inventory_items (category);

create index if not exists inventory_items_status_idx
  on public.inventory_items (status);

create or replace function public.update_inventory_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_inventory_updated_at on public.inventory_items;
create trigger trg_inventory_updated_at
before update on public.inventory_items
for each row
execute function public.update_inventory_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.inventory_items enable row level security;

create policy "Inventory items are readable by anyone"
on public.inventory_items for select
using (true);

create policy "Only admin users can insert inventory items"
on public.inventory_items for insert
with check (public.is_admin());

create policy "Only admin users can update inventory items"
on public.inventory_items for update
using (public.is_admin())
with check (public.is_admin());

create policy "Only admin users can delete inventory items"
on public.inventory_items for delete
using (public.is_admin());

create table if not exists public.service_requests (
  id text primary key,
  item_id bigint references public.inventory_items(id) on delete set null,
  asset_name text,
  request_type text not null default 'Hardware Fault',
  priority text not null default 'Medium',
  requester text not null,
  department text,
  campus text,
  contact text,
  room text,
  issue_summary text not null,
  preferred_date text,
  notes text,
  status text not null default 'Open' check (
    status in ('Open', 'In Progress', 'Waiting for Parts', 'Resolved', 'Closed')
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists service_requests_status_idx
  on public.service_requests (status);

create index if not exists service_requests_item_id_idx
  on public.service_requests (item_id);

create or replace function public.update_service_request_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_service_request_updated_at on public.service_requests;
create trigger trg_service_request_updated_at
before update on public.service_requests
for each row
execute function public.update_service_request_updated_at();

alter table public.service_requests enable row level security;

create policy "Service requests are readable by anyone"
on public.service_requests for select
using (true);

create policy "Anyone may submit a service request"
on public.service_requests for insert
with check (true);

create policy "Only admin users may update service requests"
on public.service_requests for update
using (public.is_admin())
with check (public.is_admin());

create policy "Only admin users may delete service requests"
on public.service_requests for delete
using (public.is_admin());

-- Optional: if you want a wider internal workflow later, add a dedicated
-- requester_email, assigned_to, resolution_notes, and closed_at column.
