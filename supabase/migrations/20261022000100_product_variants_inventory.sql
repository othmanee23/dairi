-- Normalized product variants make size/color-specific SKUs and inventory queryable.
alter table public.products
  add column if not exists style_number text;

create unique index if not exists products_style_number_unique
  on public.products (lower(style_number))
  where style_number is not null and btrim(style_number) <> '';

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  sku text not null unique,
  color text not null default '',
  color_hex text,
  size text not null default '',
  retail_price numeric(12,2) check (retail_price is null or retail_price >= 0),
  wholesale_price numeric(12,2) check (wholesale_price is null or wholesale_price >= 0),
  inventory_quantity integer not null default 0 check (inventory_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, color, size)
);

create index if not exists product_variants_product_active
  on public.product_variants (product_id, is_active, size);

-- Preserve the existing catalog's color and sizes while giving each combination
-- a stable SKU. Existing stock is intentionally unknown and starts at zero.
insert into public.product_variants (product_id, sku, color, color_hex, size)
select p.id,
       upper(left(regexp_replace(coalesce(nullif(p.id, ''), 'product') || '-' || coalesce(nullif(p.color, ''), 'default') || '-' || coalesce(nullif(s.size, ''), 'one-size'), '[^A-Za-z0-9-]+', '-', 'g'), 48)) || '-' || upper(substr(md5(p.id || ':' || coalesce(p.color, '') || ':' || coalesce(s.size, '')), 1, 8)),
       coalesce(p.color, ''), p.color_hex, coalesce(s.size, '')
from public.products p
cross join lateral (
  select distinct unnest(coalesce(p.sizes, array[''])) as size
) s
where not exists (select 1 from public.product_variants v where v.product_id = p.id)
on conflict do nothing;

alter table public.product_variants enable row level security;
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

create policy "public read active published product variants"
  on public.product_variants for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published' and p.show_on_website
    )
    or public.is_dairi_admin()
  );
create policy "admins manage product variants"
  on public.product_variants for all to authenticated
  using (public.is_dairi_admin()) with check (public.is_dairi_admin());

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists sku text,
  add column if not exists color text not null default '';

-- Submit an unpaid order and reserve stock in one transaction. The service role
-- is the only caller; the browser never receives privileged inventory access.
create or replace function public.submit_unpaid_order(p_customer jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_name text := btrim(coalesce(p_customer ->> 'name', ''));
  v_email text := lower(btrim(coalesce(p_customer ->> 'email', '')));
  v_order_id uuid;
  v_order_number text := 'DR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_item jsonb;
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_order_lines jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception using errcode = '22023', message = 'Your bag is empty or contains too many items.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item ->> 'variantId', '') = '' then
      raise exception using errcode = '22023', message = 'A selected size and color is missing. Refresh your bag and try again.';
    end if;
    begin
      v_quantity := (v_item ->> 'quantity')::integer;
      v_variant.id := (v_item ->> 'variantId')::uuid;
    exception when others then
      raise exception using errcode = '22023', message = 'One or more items are invalid.';
    end;
    if v_quantity < 1 or v_quantity > 20 then
      raise exception using errcode = '22023', message = 'Maximum quantity per item is 20.';
    end if;

    select * into v_variant from public.product_variants
    where id = v_variant.id and is_active for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'A selected option is no longer available.';
    end if;
    if coalesce(v_item ->> 'productId', '') <> v_variant.product_id then
      raise exception using errcode = '22023', message = 'The selected option does not match the product.';
    end if;
    select * into v_product from public.products
    where id = v_variant.product_id and status = 'published' and show_on_website;
    if not found then
      raise exception using errcode = 'P0001', message = 'A product in your bag is no longer available.';
    end if;
    if v_variant.inventory_quantity < v_quantity then
      raise exception using errcode = 'P0001', message = 'There is not enough stock for ' || v_product.name || ' (' || coalesce(v_variant.color, 'standard') || ', ' || coalesce(v_variant.size, 'one size') || ').';
    end if;

    v_unit_price := coalesce(v_variant.retail_price, v_product.price);
    v_subtotal := v_subtotal + v_unit_price * v_quantity;
    v_order_lines := v_order_lines || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.id, 'product_id', v_product.id, 'product_name', v_product.name,
      'sku', v_variant.sku, 'color', v_variant.color, 'size', v_variant.size,
      'quantity', v_quantity, 'unit_price', v_unit_price, 'image', v_product.images[1]
    ));
  end loop;

  if v_subtotal <= 0 then
    raise exception using errcode = '22023', message = 'Order total must be greater than zero.';
  end if;
  insert into public.orders (order_number, customer_name, customer_email, shipping_address, currency, subtotal, shipping, tax, total, status)
  values (
    v_order_number, v_customer_name, v_email,
    jsonb_build_object('address', p_customer ->> 'address', 'city', p_customer ->> 'city', 'postalCode', p_customer ->> 'postalCode', 'country', p_customer ->> 'country'),
    'USD', v_subtotal, 0, 0, v_subtotal, 'pending'
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price, image, variant_id, sku, color)
  select v_order_id, line ->> 'product_id', line ->> 'product_name', line ->> 'size', (line ->> 'quantity')::integer,
         (line ->> 'unit_price')::numeric, line ->> 'image', (line ->> 'variant_id')::uuid, line ->> 'sku', line ->> 'color'
  from jsonb_array_elements(v_order_lines) line;

  update public.product_variants v
  set inventory_quantity = v.inventory_quantity - requested.quantity,
      updated_at = now()
  from (
    select (line ->> 'variant_id')::uuid as variant_id, sum((line ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(v_order_lines) line group by (line ->> 'variant_id')::uuid
  ) requested
  where v.id = requested.variant_id;

  return jsonb_build_object('id', v_order_number, 'createdAt', now(), 'total', v_subtotal, 'status', 'pending', 'items', v_order_lines);
end;
$$;
revoke all on function public.submit_unpaid_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.submit_unpaid_order(jsonb, jsonb) to service_role;
