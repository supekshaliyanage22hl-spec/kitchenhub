-- The Kitchen Hub catalogue: run this once in Supabase > SQL Editor

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort int default 0
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  model text,
  description text,
  specs jsonb default '[]',            -- [{"l":"Power","v":"3 kW"}, ...]
  price text default 'Price on request',
  images text[] default '{}',          -- public image URLs (2-3 per item)
  sort int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  value text
);

-- Customers can read; only logged-in admins can change anything.
alter table categories enable row level security;
alter table products   enable row level security;
alter table settings   enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read products"   on products   for select using (active);
create policy "public read settings"   on settings   for select using (true);
create policy "admin write categories" on categories for all to authenticated using (true) with check (true);
create policy "admin write products"   on products   for all to authenticated using (true) with check (true);
create policy "admin write settings"   on settings   for all to authenticated using (true) with check (true);

-- Public image bucket
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public read images" on storage.objects for select using (bucket_id = 'product-images');
create policy "admin upload images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "admin update images" on storage.objects for update to authenticated using (bucket_id = 'product-images');
create policy "admin delete images" on storage.objects for delete to authenticated using (bucket_id = 'product-images');
