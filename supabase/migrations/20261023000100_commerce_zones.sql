-- Admin-maintained destination rules. Empty rates mean a studio quote is required;
-- zero is an intentional configured rate and remains distinct from missing data.
create table public.commerce_zones (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  region_code text not null default '',
  shipping_amount numeric(12,2) check (shipping_amount is null or shipping_amount >= 0),
  free_shipping_threshold numeric(12,2) check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  tax_rate numeric(7,4) check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 100)),
  tax_shipping boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (country_code, region_code)
);
alter table public.commerce_zones enable row level security;
revoke all on public.commerce_zones from anon, authenticated;
grant select, insert, update, delete on public.commerce_zones to authenticated;
create policy "admins manage commerce zones" on public.commerce_zones
  for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());

create or replace function public.estimate_checkout_charges(p_country_code text, p_region_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_zone public.commerce_zones%rowtype;
  v_shipping numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_shipping_configured boolean := false;
  v_tax_configured boolean := false;
begin
  if coalesce(p_country_code, '') !~ '^[A-Za-z]{2}$' then
    raise exception using errcode = '22023', message = 'Enter a valid two-letter country code.';
  end if;
  if p_subtotal is null or p_subtotal < 0 or p_subtotal > 10000000 then
    raise exception using errcode = '22023', message = 'Order subtotal is invalid.';
  end if;
  select * into v_zone from public.commerce_zones
    where active and country_code = upper(p_country_code)
      and region_code in (upper(coalesce(p_region_code, '')), '')
    order by (region_code <> '') desc limit 1;
  if found then
    v_shipping_configured := v_zone.shipping_amount is not null;
    if v_shipping_configured then
      v_shipping := case when v_zone.free_shipping_threshold is not null and p_subtotal >= v_zone.free_shipping_threshold then 0 else v_zone.shipping_amount end;
    end if;
    v_tax_configured := v_zone.tax_rate is not null;
    if v_tax_configured then
      v_tax := round((p_subtotal + case when v_zone.tax_shipping then v_shipping else 0 end) * v_zone.tax_rate / 100, 2);
    end if;
  end if;
  return jsonb_build_object('shipping', v_shipping, 'tax', v_tax, 'total', p_subtotal + v_shipping + v_tax,
    'shippingConfigured', v_shipping_configured, 'taxConfigured', v_tax_configured,
    'currency', 'USD', 'zoneId', v_zone.id);
end;
$$;
revoke all on function public.estimate_checkout_charges(text,text,numeric) from public;
grant execute on function public.estimate_checkout_charges(text,text,numeric) to anon, authenticated, service_role;

create or replace function public.submit_unpaid_order(p_customer jsonb, p_items jsonb, p_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_customer_name text := btrim(coalesce(p_customer ->> 'name', ''));
  v_email text := lower(btrim(coalesce(p_customer ->> 'email', '')));
  v_order_id uuid;
  v_order_number text := 'DR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_item jsonb;
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
  v_wholesale boolean := false;
  v_moq integer := 1;
  v_total_quantity integer := 0;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_charge jsonb;
  v_order_lines jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception using errcode = '22023', message = 'Your bag is empty or contains too many items.';
  end if;
  if p_user_id is not null then
    select (p.wholesale_status = 'approved'), p.wholesale_moq into v_wholesale, v_moq
      from public.profiles p where p.id = p_user_id and p.role = 'customer' and lower(p.email) = v_email;
    if not found then raise exception using errcode = '42501', message = 'Sign in with the customer email on this order.'; end if;
    v_moq := greatest(coalesce(v_moq, 12), 1);
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_item ->> 'variantId', '') = '' then raise exception using errcode = '22023', message = 'A selected size and color is missing. Refresh your bag and try again.'; end if;
    begin
      v_quantity := (v_item ->> 'quantity')::integer;
      v_variant.id := (v_item ->> 'variantId')::uuid;
    exception when others then raise exception using errcode = '22023', message = 'One or more items are invalid.'; end;
    if v_quantity < 1 or v_quantity > 20 then raise exception using errcode = '22023', message = 'Maximum quantity per item is 20.'; end if;
    select * into v_variant from public.product_variants where id = v_variant.id and is_active for update;
    if not found then raise exception using errcode = 'P0001', message = 'A selected option is no longer available.'; end if;
    if coalesce(v_item ->> 'productId', '') <> v_variant.product_id then raise exception using errcode = '22023', message = 'The selected option does not match the product.'; end if;
    select * into v_product from public.products where id = v_variant.product_id and status = 'published' and show_on_website;
    if not found then raise exception using errcode = 'P0001', message = 'A product in your bag is no longer available.'; end if;
    if v_variant.inventory_quantity < v_quantity then raise exception using errcode = 'P0001', message = 'There is not enough stock for ' || v_product.name || '.'; end if;
    if v_wholesale then
      select price into v_unit_price from public.wholesale_variant_prices where variant_id = v_variant.id;
      if not found then raise exception using errcode = 'P0001', message = 'Wholesale pricing is not set for ' || v_product.name || ' (' || v_variant.sku || '). Please contact DAIRI.'; end if;
    else v_unit_price := coalesce(v_variant.retail_price, v_product.price);
    end if;
    v_total_quantity := v_total_quantity + v_quantity;
    v_subtotal := v_subtotal + v_unit_price * v_quantity;
    v_order_lines := v_order_lines || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.id, 'product_id', v_product.id, 'product_name', v_product.name,
      'sku', v_variant.sku, 'color', v_variant.color, 'size', v_variant.size,
      'quantity', v_quantity, 'unit_price', v_unit_price, 'image', v_product.images[1]
    ));
  end loop;
  if v_wholesale and v_total_quantity < v_moq then
    raise exception using errcode = 'P0001', message = 'Wholesale orders require at least ' || v_moq || ' pieces. Your bag has ' || v_total_quantity || '.';
  end if;
  if v_subtotal <= 0 then raise exception using errcode = '22023', message = 'Order total must be greater than zero.'; end if;
  v_charge := public.estimate_checkout_charges(p_customer ->> 'country', p_customer ->> 'region', v_subtotal);
  v_shipping := (v_charge ->> 'shipping')::numeric;
  v_tax := (v_charge ->> 'tax')::numeric;
  insert into public.orders (order_number, user_id, customer_name, customer_email, shipping_address, currency, subtotal, shipping, tax, total, status)
  values (v_order_number, p_user_id, v_customer_name, v_email,
    jsonb_build_object('address', p_customer ->> 'address', 'city', p_customer ->> 'city', 'region', p_customer ->> 'region', 'postalCode', p_customer ->> 'postalCode', 'country', upper(p_customer ->> 'country'), 'shippingConfigured', (v_charge ->> 'shippingConfigured')::boolean, 'taxConfigured', (v_charge ->> 'taxConfigured')::boolean),
    'USD', v_subtotal, v_shipping, v_tax, v_subtotal + v_shipping + v_tax, 'pending') returning id into v_order_id;
  insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price, image, variant_id, sku, color)
  select v_order_id, line ->> 'product_id', line ->> 'product_name', line ->> 'size', (line ->> 'quantity')::integer,
    (line ->> 'unit_price')::numeric, line ->> 'image', (line ->> 'variant_id')::uuid, line ->> 'sku', line ->> 'color'
    from jsonb_array_elements(v_order_lines) line;
  update public.product_variants v set inventory_quantity = v.inventory_quantity - requested.quantity, updated_at = now()
    from (select (line ->> 'variant_id')::uuid as variant_id, sum((line ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_order_lines) line group by (line ->> 'variant_id')::uuid) requested
    where v.id = requested.variant_id;
  return jsonb_build_object('id', v_order_number, 'createdAt', now(), 'subtotal', v_subtotal, 'shipping', v_shipping, 'tax', v_tax,
    'shippingConfigured', (v_charge ->> 'shippingConfigured')::boolean, 'taxConfigured', (v_charge ->> 'taxConfigured')::boolean,
    'total', v_subtotal + v_shipping + v_tax, 'status', 'pending', 'items', v_order_lines, 'currency', 'USD');
end;
$$;
revoke all on function public.submit_unpaid_order(jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.submit_unpaid_order(jsonb,jsonb,uuid) to service_role;
