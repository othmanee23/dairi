-- Preserve checkout's destination region and return explicit monetary components.
-- Shipping and taxes remain studio-confirmed; this migration does not invent rates.
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
  insert into public.orders (order_number, user_id, customer_name, customer_email, shipping_address, currency, subtotal, shipping, tax, total, status)
  values (v_order_number, p_user_id, v_customer_name, v_email,
    jsonb_build_object('address', p_customer ->> 'address', 'city', p_customer ->> 'city', 'region', p_customer ->> 'region', 'postalCode', p_customer ->> 'postalCode', 'country', p_customer ->> 'country'),
    'USD', v_subtotal, 0, 0, v_subtotal, 'pending') returning id into v_order_id;
  insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price, image, variant_id, sku, color)
  select v_order_id, line ->> 'product_id', line ->> 'product_name', line ->> 'size', (line ->> 'quantity')::integer,
    (line ->> 'unit_price')::numeric, line ->> 'image', (line ->> 'variant_id')::uuid, line ->> 'sku', line ->> 'color'
    from jsonb_array_elements(v_order_lines) line;
  update public.product_variants v set inventory_quantity = v.inventory_quantity - requested.quantity, updated_at = now()
    from (select (line ->> 'variant_id')::uuid as variant_id, sum((line ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_order_lines) line group by (line ->> 'variant_id')::uuid) requested
    where v.id = requested.variant_id;
  return jsonb_build_object('id', v_order_number, 'createdAt', now(), 'subtotal', v_subtotal, 'shipping', 0, 'tax', 0, 'total', v_subtotal, 'status', 'pending', 'items', v_order_lines, 'currency', 'USD');
end;
$$;
revoke all on function public.submit_unpaid_order(jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.submit_unpaid_order(jsonb,jsonb,uuid) to service_role;
