-- DAIRI commerce backend foundation. Prices are USD; numeric values are major currency units.
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_dairi_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;
revoke all on function public.is_dairi_admin() from public;
grant execute on function public.is_dairi_admin() to anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.products (
  id text primary key, name text not null, price numeric(12,2) not null check (price >= 0),
  images text[] not null default '{}', category text not null default '', collection text not null default '',
  description text not null default '', tags text[] not null default '{}', status text not null default 'draft' check (status in ('published','draft')),
  show_on_website boolean not null default false, created_at timestamptz not null default now(),
  color text, color_hex text, details text[] not null default '{}', material text, fit text, care text, sizes text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create index products_public_listing on public.products (category, created_at desc) where status = 'published' and show_on_website = true;

create table public.collections (
  id text primary key, name text not null, description text not null default '', season text not null default '',
  image text not null default '', product_count integer not null default 0 check (product_count >= 0),
  is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.lookbooks (
  id text primary key, name text not null, created_at timestamptz not null default now(), product_ids text[] not null default '{}',
  layout text not null check (layout in ('minimal','editorial','magazine')), cover_title text not null default '',
  cover_image text, format text not null check (format in ('a4','square','portrait')), updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(), order_number text unique not null, user_id uuid references auth.users(id) on delete set null,
  customer_name text not null, customer_email text not null, shipping_address jsonb not null,
  currency char(3) not null default 'USD' check (currency = 'USD'), subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping numeric(12,2) not null default 0 check (shipping >= 0), tax numeric(12,2) not null default 0 check (tax >= 0),
  total numeric(12,2) not null check (total >= 0), status text not null default 'pending' check (status in ('pending','paid','processing','shipped','delivered','cancelled','refunded')) ,
  payment_provider text, payment_reference text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id text, product_name text not null, size text not null default '', quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0), image text
);

create table public.newsletter_subscribers (
  email text primary key, consented_at timestamptz not null default now(), unsubscribed_at timestamptz
);
create table public.support_requests (
  id uuid primary key default gen_random_uuid(), email text not null, message text not null check (length(message) between 1 and 10000),
  status text not null default 'open' check (status in ('open','in_progress','closed')), created_at timestamptz not null default now()
);
create table public.store_settings (
  id text primary key default 'default' check (id = 'default'), brand_name text not null default 'DAIRI', logo text not null default '',
  primary_color text not null default '#000000', secondary_color text not null default '#f5f5f5', font_family text not null default 'inter',
  default_format text not null default 'a4' check (default_format in ('a4','square','portrait')),
  default_layout text not null default 'editorial' check (default_layout in ('minimal','editorial','magazine')),
  email text not null default '', name text not null default '', currency char(3) not null default 'USD' check (currency = 'USD'), updated_at timestamptz not null default now()
);

-- RLS is enabled everywhere. Public writes (checkout, signup, contact) will go through
-- trusted server/edge functions with validation and anti-abuse controls; anon clients
-- never get direct insert access to orders, newsletter, or support tables.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.collections enable row level security;
alter table public.lookbooks enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.support_requests enable row level security;
alter table public.store_settings enable row level security;

create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_dairi_admin());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());
create policy "public read published products" on public.products for select to anon, authenticated using (status = 'published' and show_on_website or public.is_dairi_admin());
create policy "admins manage products" on public.products for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());
create policy "public read published collections" on public.collections for select to anon, authenticated using (is_published or public.is_dairi_admin());
create policy "admins manage collections" on public.collections for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());
create policy "admins manage lookbooks" on public.lookbooks for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());
create policy "admins read all orders" on public.orders for select to authenticated using (public.is_dairi_admin());
create policy "customers read own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()));
create policy "admins manage orders" on public.orders for update to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());
create policy "admins read order items" on public.order_items for select to authenticated using (public.is_dairi_admin());
create policy "customers read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "admins read subscribers" on public.newsletter_subscribers for select to authenticated using (public.is_dairi_admin());
create policy "admins manage subscribers" on public.newsletter_subscribers for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());
create policy "admins manage support requests" on public.support_requests for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());
create policy "admins manage store settings" on public.store_settings for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());

insert into public.store_settings (id) values ('default') on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;
create policy "public read product media" on storage.objects for select to anon, authenticated using (bucket_id = 'product-media');
create policy "admins upload product media" on storage.objects for insert to authenticated with check (bucket_id = 'product-media' and public.is_dairi_admin());
create policy "admins update product media" on storage.objects for update to authenticated using (bucket_id = 'product-media' and public.is_dairi_admin()) with check (bucket_id = 'product-media' and public.is_dairi_admin());
create policy "admins delete product media" on storage.objects for delete to authenticated using (bucket_id = 'product-media' and public.is_dairi_admin());
