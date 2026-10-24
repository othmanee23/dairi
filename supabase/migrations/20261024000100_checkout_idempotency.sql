-- Server-enforced checkout replay protection. One request key is scoped to one
-- customer identity and permanently bound to the canonical request payload.
create table public.checkout_idempotency (
  scope_key text not null,
  idempotency_key uuid not null,
  request_hash text not null,
  order_id uuid references public.orders(id) on delete restrict,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (scope_key, idempotency_key),
  check ((order_id is null) = (response is null))
);
alter table public.checkout_idempotency enable row level security;
revoke all on public.checkout_idempotency from public, anon, authenticated;
grant all on public.checkout_idempotency to service_role;

drop function public.submit_unpaid_order(jsonb, jsonb, uuid);
create function public.submit_unpaid_order(
  p_customer jsonb,
  p_items jsonb,
  p_user_id uuid,
  p_idempotency_key uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_customer_name text := btrim(coalesce(p_customer ->> 'name', ''));
  v_email text := lower(btrim(coalesce(p_customer ->> 'email', '')));
  v_scope_key text;
  v_request_hash text;
  v_existing public.checkout_idempotency%rowtype;
  v_inserted integer;
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
  v_response jsonb;
begin
  if p_idempotency_key is null then raise exception using errcode = '22023', message = 'Checkout request key is missing. Refresh your bag and try again.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception using errcode = '22023', message = 'Your bag is empty or contains too many items.'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) item group by item ->> 'variantId' having count(*) > 1) then raise exception using errcode = '22023', message = 'One or more size options are repeated. Refresh your bag and try again.'; end if;
  v_scope_key := case when p_user_id is not null then 'user:' || p_user_id::text else 'guest:' || encode(extensions.digest(v_email, 'sha256'), 'hex') end;
  v_request_hash := encode(extensions.digest(jsonb_build_object('customer', p_customer, 'items', p_items, 'userId', p_user_id)::text, 'sha256'), 'hex');

  insert into public.checkout_idempotency(scope_key, idempotency_key, request_hash)
    values (v_scope_key, p_idempotency_key, v_request_hash)
    on conflict (scope_key, idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select * into v_existing from public.checkout_idempotency
      where scope_key = v_scope_key and idempotency_key = p_idempotency_key for update;
    if v_existing.request_hash <> v_request_hash then
      raise exception using errcode = '22023', message = 'This checkout request key is already in use for a different order.';
    end if;
    if v_existing.response is null then
      raise exception using errcode = '40001', message = 'This checkout is still processing. Retry the same request shortly.';
    end if;
    return v_existing.response;
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
    exception when others then raise exception using errcode = '22023', message = 'One or more items are invalid.';
    end;
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
    v_order_lines := v_order_lines || jsonb_build_array(jsonb_build_object('variant_id', v_variant.id, 'product_id', v_product.id, 'product_name', v_product.name, 'sku', v_variant.sku, 'color', v_variant.color, 'size', v_variant.size, 'quantity', v_quantity, 'unit_price', v_unit_price, 'image', v_product.images[1]));
  end loop;

  if v_wholesale and v_total_quantity < v_moq then raise exception using errcode = 'P0001', message = 'Wholesale orders require at least ' || v_moq || ' pieces. Your bag has ' || v_total_quantity || '.'; end if;
  if v_subtotal <= 0 then raise exception using errcode = '22023', message = 'Order total must be greater than zero.'; end if;
  v_discount_result := public.apply_discount_code(p_customer ->> 'discountCode', v_subtotal, v_wholesale, true);
  v_discount := (v_discount_result ->> 'discount')::numeric;
  v_code := v_discount_result ->> 'code';
  v_charge := public.estimate_checkout_charges(p_customer ->> 'country', p_customer ->> 'region', v_subtotal - v_discount, null, v_wholesale);
  v_shipping := (v_charge ->> 'shipping')::numeric;
  v_tax := (v_charge ->> 'tax')::numeric;

  insert into public.orders (order_number,user_id,customer_name,customer_email,shipping_address,currency,subtotal,discount,discount_code,shipping,tax,total,status)
  values (v_order_number,p_user_id,v_customer_name,v_email,jsonb_build_object('address',p_customer->>'address','city',p_customer->>'city','region',p_customer->>'region','postalCode',p_customer->>'postalCode','country',upper(p_customer->>'country'),'shippingConfigured',(v_charge->>'shippingConfigured')::boolean,'taxConfigured',(v_charge->>'taxConfigured')::boolean),'USD',v_subtotal,v_discount,v_code,v_shipping,v_tax,v_subtotal-v_discount+v_shipping+v_tax,'pending') returning id into v_order_id;

  insert into public.order_items (order_id,product_id,product_name,size,quantity,unit_price,image,variant_id,sku,color)
    select v_order_id,line->>'product_id',line->>'product_name',line->>'size',(line->>'quantity')::integer,(line->>'unit_price')::numeric,line->>'image',(line->>'variant_id')::uuid,line->>'sku',line->>'color'
    from jsonb_array_elements(v_order_lines) line;
  update public.product_variants v set inventory_quantity=v.inventory_quantity-requested.quantity,updated_at=now()
    from (select (line->>'variant_id')::uuid as variant_id,sum((line->>'quantity')::integer)::integer as quantity from jsonb_array_elements(v_order_lines) line group by (line->>'variant_id')::uuid) requested
    where v.id=requested.variant_id;

  v_response := jsonb_build_object('id',v_order_number,'createdAt',now(),'subtotal',v_subtotal,'discount',v_discount,'discountCode',v_code,'shipping',v_shipping,'tax',v_tax,'shippingConfigured',(v_charge->>'shippingConfigured')::boolean,'taxConfigured',(v_charge->>'taxConfigured')::boolean,'total',v_subtotal-v_discount+v_shipping+v_tax,'status','pending','items',v_order_lines,'currency','USD');
  update public.checkout_idempotency set order_id=v_order_id,response=v_response where scope_key=v_scope_key and idempotency_key=p_idempotency_key;
  return v_response;
end;
$$;
revoke all on function public.submit_unpaid_order(jsonb,jsonb,uuid,uuid) from public, anon, authenticated;
grant execute on function public.submit_unpaid_order(jsonb,jsonb,uuid,uuid) to service_role;

create table public.public_action_rate_limits (
  action text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (action, subject_hash)
);
alter table public.public_action_rate_limits enable row level security;
revoke all on public.public_action_rate_limits from public, anon, authenticated;
grant all on public.public_action_rate_limits to service_role;

create function public.consume_public_action_limit(p_action text, p_subject text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_window_seconds integer;
  v_hash text;
  v_window timestamptz;
  v_count integer;
begin
  case p_action
    when 'subscribe' then v_limit := 5; v_window_seconds := 3600;
    when 'support' then v_limit := 3; v_window_seconds := 3600;
    when 'wholesale' then v_limit := 2; v_window_seconds := 86400;
    when 'order' then v_limit := 5; v_window_seconds := 3600;
    else raise exception using errcode = '22023', message = 'Unsupported rate-limit action.';
  end case;
  if coalesce(btrim(p_subject), '') = '' then raise exception using errcode = '22023', message = 'Rate-limit subject is required.'; end if;
  v_hash := encode(extensions.digest(lower(btrim(p_subject)), 'sha256'), 'hex');
  v_window := to_timestamp(floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds);
  if random() < 0.01 then
    with expired as (
      select action, subject_hash from public.public_action_rate_limits
      where window_started_at < now() - interval '2 days'
      order by window_started_at limit 500
    )
    delete from public.public_action_rate_limits limits using expired
      where limits.action = expired.action and limits.subject_hash = expired.subject_hash;
  end if;
  insert into public.public_action_rate_limits as current_limit(action, subject_hash, window_started_at, request_count)
    values (p_action, v_hash, v_window, 1)
    on conflict (action, subject_hash) do update
      set request_count = case when current_limit.window_started_at = excluded.window_started_at then current_limit.request_count + 1 else 1 end,
          window_started_at = excluded.window_started_at
    returning request_count into v_count;
  return v_count <= v_limit;
end;
$$;
revoke all on function public.consume_public_action_limit(text,text) from public, anon, authenticated;
grant execute on function public.consume_public_action_limit(text,text) to service_role;
