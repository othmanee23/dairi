-- Store-owned coupon codes; redemptions are validated and counted in the order transaction.
alter table public.orders add column discount numeric(12,2) not null default 0 check (discount >= 0);
alter table public.orders add column discount_code text;

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(btrim(code)) and code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
  discount_type text not null check (discount_type in ('percentage','fixed')),
  amount numeric(12,2) not null check (amount > 0),
  minimum_subtotal numeric(12,2) not null default 0 check (minimum_subtotal >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  applies_to text not null default 'retail' check (applies_to in ('retail','wholesale','all')),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (expires_at is null or starts_at is null or expires_at > starts_at),
  check (discount_type <> 'percentage' or amount <= 100)
);
alter table public.discount_codes enable row level security;
revoke all on public.discount_codes from anon, authenticated;
grant select, insert, update, delete on public.discount_codes to authenticated;
create policy "admins manage discount codes" on public.discount_codes
  for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());

create or replace function public.apply_discount_code(p_code text, p_subtotal numeric, p_wholesale boolean, p_reserve boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_code public.discount_codes%rowtype; v_discount numeric(12,2); v_updated integer;
begin
  if coalesce(btrim(p_code), '') = '' then return jsonb_build_object('code', null, 'discount', 0); end if;
  if p_subtotal is null or p_subtotal < 0 then raise exception using errcode = '22023', message = 'Order subtotal is invalid.'; end if;
  select * into v_code from public.discount_codes where code = upper(btrim(p_code));
  if not found or not v_code.active or (v_code.starts_at is not null and v_code.starts_at > now())
      or (v_code.expires_at is not null and v_code.expires_at <= now())
      or (v_code.max_redemptions is not null and v_code.redemption_count >= v_code.max_redemptions)
      or p_subtotal < v_code.minimum_subtotal
      or (v_code.applies_to <> 'all' and v_code.applies_to <> case when p_wholesale then 'wholesale' else 'retail' end) then
    raise exception using errcode = '22023', message = 'This discount code is invalid or unavailable for this order.';
  end if;
  v_discount := least(p_subtotal, case when v_code.discount_type = 'percentage' then round(p_subtotal * v_code.amount / 100, 2) else v_code.amount end);
  if p_reserve then
    update public.discount_codes set redemption_count = redemption_count + 1, updated_at = now()
      where id = v_code.id and active and (starts_at is null or starts_at <= now()) and (expires_at is null or expires_at > now())
        and (max_redemptions is null or redemption_count < max_redemptions)
      returning 1 into v_updated;
    if v_updated is null then raise exception using errcode = '22023', message = 'This discount code has just reached its redemption limit. Remove the code and try again.'; end if;
  end if;
  return jsonb_build_object('code', v_code.code, 'discount', v_discount);
end;
$$;
revoke all on function public.apply_discount_code(text,numeric,boolean,boolean) from public, anon, authenticated;
grant execute on function public.apply_discount_code(text,numeric,boolean,boolean) to service_role;

drop function public.estimate_checkout_charges(text,text,numeric);
create function public.estimate_checkout_charges(p_country_code text, p_region_code text, p_subtotal numeric, p_discount_code text default null, p_wholesale boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_zone public.commerce_zones%rowtype;
  v_shipping numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_discount_result jsonb;
  v_discounted_subtotal numeric(12,2);
  v_shipping_configured boolean := false;
  v_tax_configured boolean := false;
begin
  if coalesce(p_country_code, '') !~ '^[A-Za-z]{2}$' then raise exception using errcode = '22023', message = 'Enter a valid two-letter country code.'; end if;
  if p_subtotal is null or p_subtotal < 0 or p_subtotal > 10000000 then raise exception using errcode = '22023', message = 'Order subtotal is invalid.'; end if;
  v_discount_result := public.apply_discount_code(p_discount_code, p_subtotal, coalesce(p_wholesale, false), false);
  v_discount := (v_discount_result ->> 'discount')::numeric;
  v_discounted_subtotal := p_subtotal - v_discount;
  select * into v_zone from public.commerce_zones
    where active and country_code = upper(p_country_code) and region_code in (upper(coalesce(p_region_code, '')), '')
    order by (region_code <> '') desc limit 1;
  if found then
    v_shipping_configured := v_zone.shipping_amount is not null;
    if v_shipping_configured then v_shipping := case when v_zone.free_shipping_threshold is not null and v_discounted_subtotal >= v_zone.free_shipping_threshold then 0 else v_zone.shipping_amount end; end if;
    v_tax_configured := v_zone.tax_rate is not null;
    if v_tax_configured then v_tax := round((v_discounted_subtotal + case when v_zone.tax_shipping then v_shipping else 0 end) * v_zone.tax_rate / 100, 2); end if;
  end if;
  return jsonb_build_object('subtotal', p_subtotal, 'discount', v_discount, 'discountCode', v_discount_result -> 'code',
    'shipping', v_shipping, 'tax', v_tax, 'total', v_discounted_subtotal + v_shipping + v_tax,
    'shippingConfigured', v_shipping_configured, 'taxConfigured', v_tax_configured, 'currency', 'USD');
end;
$$;
revoke all on function public.estimate_checkout_charges(text,text,numeric,text,boolean) from public;
grant execute on function public.estimate_checkout_charges(text,text,numeric,text,boolean) to service_role;

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
  v_discount_result jsonb;
  v_discount numeric(12,2) := 0;
  v_code text;
  v_shipping numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_charge jsonb;
  v_order_lines jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception using errcode = '22023', message = 'Your bag is empty or contains too many items.'; end if;
  if p_user_id is not null then
    select (p.wholesale_status = 'approved'), p.wholesale_moq into v_wholesale, v_moq from public.profiles p where p.id = p_user_id and p.role = 'customer' and lower(p.email) = v_email;
    if not found then raise exception using errcode = '42501', message = 'Sign in with the customer email on this order.'; end if;
    v_moq := greatest(coalesce(v_moq, 12), 1);
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_item ->> 'variantId', '') = '' then raise exception using errcode = '22023', message = 'A selected size and color is missing. Refresh your bag and try again.'; end if;
    begin v_quantity := (v_item ->> 'quantity')::integer; v_variant.id := (v_item ->> 'variantId')::uuid;
    exception when others then raise exception using errcode = '22023', message = 'One or more items are invalid.'; end;
    if v_quantity < 1 or v_quantity > 20 then raise exception using errcode = '22023', message = 'Maximum quantity per item is 20.'; end if;
    select * into v_variant from public.product_variants where id = v_variant.id and is_active for update;
    if not found then raise exception using errcode = 'P0001', message = 'A selected option is no longer available.'; end if;
    if coalesce(v_item ->> 'productId', '') <> v_variant.product_id then raise exception using errcode = '22023', message = 'The selected option does not match the product.'; end if;
    select * into v_product from public.products where id = v_variant.product_id and status = 'published' and show_on_website;
    if not found then raise exception using errcode = 'P0001', message = 'A product in your bag is no longer available.'; end if;
    if v_variant.inventory_quantity < v_quantity then raise exception using errcode = 'P0001', message = 'There is not enough stock for ' || v_product.name || '.'; end if;
    if v_wholesale then select price into v_unit_price from public.wholesale_variant_prices where variant_id = v_variant.id; if not found then raise exception using errcode = 'P0001', message = 'Wholesale pricing is not set for ' || v_product.name || ' (' || v_variant.sku || '). Please contact DAIRI.'; end if;
    else v_unit_price := coalesce(v_variant.retail_price, v_product.price); end if;
    v_total_quantity := v_total_quantity + v_quantity; v_subtotal := v_subtotal + v_unit_price * v_quantity;
    v_order_lines := v_order_lines || jsonb_build_array(jsonb_build_object('variant_id', v_variant.id, 'product_id', v_product.id, 'product_name', v_product.name, 'sku', v_variant.sku, 'color', v_variant.color, 'size', v_variant.size, 'quantity', v_quantity, 'unit_price', v_unit_price, 'image', v_product.images[1]));
  end loop;
  if v_wholesale and v_total_quantity < v_moq then raise exception using errcode = 'P0001', message = 'Wholesale orders require at least ' || v_moq || ' pieces. Your bag has ' || v_total_quantity || '.'; end if;
  if v_subtotal <= 0 then raise exception using errcode = '22023', message = 'Order total must be greater than zero.'; end if;
  v_discount_result := public.apply_discount_code(p_customer ->> 'discountCode', v_subtotal, v_wholesale, true);
  v_discount := (v_discount_result ->> 'discount')::numeric; v_code := v_discount_result ->> 'code';
  v_charge := public.estimate_checkout_charges(p_customer ->> 'country', p_customer ->> 'region', v_subtotal - v_discount, null, v_wholesale);
  v_shipping := (v_charge ->> 'shipping')::numeric; v_tax := (v_charge ->> 'tax')::numeric;
  insert into public.orders (order_number,user_id,customer_name,customer_email,shipping_address,currency,subtotal,discount,discount_code,shipping,tax,total,status)
  values (v_order_number,p_user_id,v_customer_name,v_email,jsonb_build_object('address',p_customer->>'address','city',p_customer->>'city','region',p_customer->>'region','postalCode',p_customer->>'postalCode','country',upper(p_customer->>'country'),'shippingConfigured',(v_charge->>'shippingConfigured')::boolean,'taxConfigured',(v_charge->>'taxConfigured')::boolean),'USD',v_subtotal,v_discount,v_code,v_shipping,v_tax,v_subtotal-v_discount+v_shipping+v_tax,'pending') returning id into v_order_id;
  insert into public.order_items (order_id,product_id,product_name,size,quantity,unit_price,image,variant_id,sku,color)
    select v_order_id,line->>'product_id',line->>'product_name',line->>'size',(line->>'quantity')::integer,(line->>'unit_price')::numeric,line->>'image',(line->>'variant_id')::uuid,line->>'sku',line->>'color' from jsonb_array_elements(v_order_lines) line;
  update public.product_variants v set inventory_quantity=v.inventory_quantity-requested.quantity,updated_at=now() from (select (line->>'variant_id')::uuid as variant_id,sum((line->>'quantity')::integer)::integer as quantity from jsonb_array_elements(v_order_lines) line group by (line->>'variant_id')::uuid) requested where v.id=requested.variant_id;
  return jsonb_build_object('id',v_order_number,'createdAt',now(),'subtotal',v_subtotal,'discount',v_discount,'discountCode',v_code,'shipping',v_shipping,'tax',v_tax,'shippingConfigured',(v_charge->>'shippingConfigured')::boolean,'taxConfigured',(v_charge->>'taxConfigured')::boolean,'total',v_subtotal-v_discount+v_shipping+v_tax,'status','pending','items',v_order_lines,'currency','USD');
end;
$$;
revoke all on function public.submit_unpaid_order(jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.submit_unpaid_order(jsonb,jsonb,uuid) to service_role;
