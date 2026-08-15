-- ============================================================
-- AGROFLOW  —  Supabase schema
-- Cold-pressed mustard & coconut oil D2C store
-- Run this whole file once in Supabase SQL Editor (or via CLI:
-- supabase db push) on a fresh project.
-- ============================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "uuid-ossp";

-- ---------- BRANDS ----------
create table if not exists brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  tagline text,
  description text,
  logo_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------- PRODUCTS ----------
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid references brands(id) on delete set null,
  name text not null,
  slug text unique not null,
  category text not null default 'mustard-oil', -- mustard-oil | coconut-oil | other
  short_description text,
  description text,
  extraction_method text default 'Kolhu / Wood cold-pressed',
  origin_farm text,
  size_ml integer default 1000,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  stock_qty integer not null default 0,
  is_available boolean default true,
  is_featured boolean default false,
  image_url text,
  gallery jsonb default '[]'::jsonb,   -- array of image urls
  nutrition jsonb default '{}'::jsonb, -- key/value facts
  rating numeric(2,1) default 4.5,
  reviews_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_brand on products(brand_id);

-- ---------- ORDERS ----------
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null default ('AF' || to_char(now(),'YYMMDD') || substr(uuid_generate_v4()::text,1,6)),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address_line text not null,
  city text not null,
  state text not null,
  pincode text not null,
  items jsonb not null,              -- [{product_id, name, price, qty, image_url}]
  subtotal numeric(10,2) not null,
  shipping_fee numeric(10,2) default 0,
  total numeric(10,2) not null,
  payment_method text not null default 'cod', -- 'cod' | 'razorpay'
  payment_status text not null default 'pending', -- pending | paid | failed | refunded
  razorpay_order_id text,
  razorpay_payment_id text,
  status text not null default 'new', -- new | confirmed | packed | shipped | delivered | cancelled
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created on orders(created_at desc);

-- ---------- LEADS (contact form) ----------
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  email text,
  message text,
  source text default 'contact_form', -- contact_form | product_enquiry
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ---------- SUPPORT TICKETS ----------
create table if not exists support_tickets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  email text,
  order_number text,
  subject text not null,
  message text not null,
  status text not null default 'open', -- open | in_progress | resolved
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ---------- ADMIN USERS (maps auth.users -> admin role) ----------
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,               -- used for WhatsApp / SMS notification target
  created_at timestamptz default now()
);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Public (anon) can: read active products/brands, insert orders/leads/tickets.
-- Only authenticated admins (present in admin_users) can read/update/delete
-- orders, leads, tickets, and manage products/brands.
-- ============================================================

alter table brands enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table leads enable row level security;
alter table support_tickets enable row level security;
alter table admin_users enable row level security;

create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$ language sql stable security definer;

-- BRANDS
create policy "public read active brands" on brands
  for select using (is_active = true or is_admin());
create policy "admin write brands" on brands
  for all using (is_admin()) with check (is_admin());

-- PRODUCTS
create policy "public read available products" on products
  for select using (is_available = true or is_admin());
create policy "admin write products" on products
  for all using (is_admin()) with check (is_admin());

-- ORDERS  (anyone can place an order; only admin can read/update)
create policy "anyone can create order" on orders
  for insert with check (true);
create policy "admin read orders" on orders
  for select using (is_admin());
create policy "admin update orders" on orders
  for update using (is_admin());
create policy "admin delete orders" on orders
  for delete using (is_admin());

-- LEADS
create policy "anyone can create lead" on leads
  for insert with check (true);
create policy "admin read leads" on leads
  for select using (is_admin());
create policy "admin update leads" on leads
  for update using (is_admin());
create policy "admin delete leads" on leads
  for delete using (is_admin());

-- SUPPORT TICKETS
create policy "anyone can create ticket" on support_tickets
  for insert with check (true);
create policy "admin read tickets" on support_tickets
  for select using (is_admin());
create policy "admin update tickets" on support_tickets
  for update using (is_admin());
create policy "admin delete tickets" on support_tickets
  for delete using (is_admin());

-- ADMIN_USERS
create policy "admin reads self" on admin_users
  for select using (auth.uid() = id or is_admin());

-- ============================================================
-- REALTIME  (used by admin dashboard for live notifications)
-- ============================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table support_tickets;

-- ============================================================
-- SEED DATA — 5 brands + sample products (edit freely, or use admin panel)
-- ============================================================
insert into brands (name, slug, tagline, description, is_active) values
 ('Anveshan Kissan', 'anveshan-kissan', 'Seedha kisan se, seedha ghar tak', 'Sarson seedhe kisano se khareedi jaati hai aur kolhu me cold-pressed ki jaati hai.', true),
 ('Girmi Gold', 'girmi-gold', 'Purity in every drop', 'Wood-pressed mustard oil, chemical free.', true),
 ('Kokum Coast', 'kokum-coast', 'From the coconut groves', 'Cold-pressed virgin coconut oil from Kerala farms.', true),
 ('Sarson Sanskar', 'sarson-sanskar', 'Parampara jo pyor ho', 'Traditional lakadi-ghani mustard oil.', true),
 ('Bharat Bhoomi', 'bharat-bhoomi', 'Mitti se, sehat tak', 'Farm-direct edible oils sourced from small farmers across India.', true)
on conflict (slug) do nothing;

insert into products (brand_id, name, slug, category, short_description, description, size_ml, price, compare_at_price, stock_qty, is_featured, image_url)
select id, 'Kachi Ghani Mustard Oil', 'kachi-ghani-mustard-oil-1l', 'mustard-oil',
  'Wood cold-pressed, unfiltered, pure pungency',
  'Extracted the traditional kolhu way at low temperature to preserve natural pungency and nutrients. No refining, no blending — just mustard seeds and stone-cold pressure.',
  1000, 449, 599, 120, true, ''
from brands where slug = 'anveshan-kissan'
on conflict (slug) do nothing;

insert into products (brand_id, name, slug, category, short_description, description, size_ml, price, compare_at_price, stock_qty, is_featured, image_url)
select id, 'Wood Pressed Mustard Oil', 'wood-pressed-mustard-oil-1l', 'mustard-oil',
  'Cold-pressed in small batches',
  'Slow-pressed in wooden ghanis to retain the natural aroma and golden colour of mustard seeds.',
  1000, 479, 620, 80, true, ''
from brands where slug = 'girmi-gold'
on conflict (slug) do nothing;

insert into products (brand_id, name, slug, category, short_description, description, size_ml, price, compare_at_price, stock_qty, is_featured, image_url)
select id, 'Virgin Coconut Oil', 'virgin-coconut-oil-500ml', 'coconut-oil',
  'Single-press, raw and unrefined',
  'Made from fresh coconut milk, cold-pressed without heat or chemicals to retain natural aroma.',
  500, 399, 499, 60, true, ''
from brands where slug = 'kokum-coast'
on conflict (slug) do nothing;

insert into products (brand_id, name, slug, category, short_description, description, size_ml, price, compare_at_price, stock_qty, is_featured, image_url)
select id, 'Lakadi Ghani Sarson Tel', 'lakadi-ghani-sarson-tel-1l', 'mustard-oil',
  'Old-world stone pressing, new-world purity',
  'Pressed the way our grandparents did — slow, cold and completely unrefined.',
  1000, 459, 560, 45, false, ''
from brands where slug = 'sarson-sanskar'
on conflict (slug) do nothing;

insert into products (brand_id, name, slug, category, short_description, description, size_ml, price, compare_at_price, stock_qty, is_featured, image_url)
select id, 'Farm Direct Mustard Oil', 'farm-direct-mustard-oil-1l', 'mustard-oil',
  'Sourced directly from small farmers',
  'We buy mustard seeds directly from farmer families and press it fresh for you.',
  1000, 429, 549, 95, false, ''
from brands where slug = 'bharat-bhoomi'
on conflict (slug) do nothing;

-- ============================================================
-- HOW TO MAKE YOURSELF ADMIN
-- 1. Sign up a user from admin/login.html (or Supabase Auth dashboard)
-- 2. Run:  insert into admin_users (id, full_name, phone)
--          values ('<the auth.users.id uuid>', 'Your Name', '+91XXXXXXXXXX');
-- ============================================================
