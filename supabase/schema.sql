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

-- To grant admin access, create a Supabase Auth user and set app_metadata.role = 'admin'.
-- Example:
--   update auth.users set raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"') where id = 'YOUR_USER_ID';
-- Or use Supabase Auth custom claims / custom user metadata for the same role check.
