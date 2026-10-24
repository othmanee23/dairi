-- Verified customer identities can claim applications. Wholesale pricing is
-- isolated from public catalog data and only visible to approved accounts.
alter table public.profiles
  add column wholesale_status text not null default 'none'
    check (wholesale_status in ('none','pending','approved','rejected')),
  add column company_name text not null default '',
  add column wholesale_moq integer not null default 12 check (wholesale_moq between 1 and 1000);

alter table public.wholesale_applications
  add column user_id uuid references auth.users(id) on delete set null,
  add column wholesale_moq integer not null default 12 check (wholesale_moq between 1 and 1000);
create index wholesale_applications_user on public.wholesale_applications(user_id) where user_id is not null;
create unique index wholesale_one_pending_application_per_email
  on public.wholesale_applications(lower(email)) where status = 'pending';
create table public.wholesale_variant_prices (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  updated_at timestamptz not null default now()
);
alter table public.wholesale_variant_prices enable row level security;
revoke all on public.wholesale_variant_prices from anon, authenticated;
grant select, insert, update, delete on public.wholesale_variant_prices to authenticated;
create policy "approved buyers read wholesale prices" on public.wholesale_variant_prices
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and (p.role = 'admin' or p.wholesale_status = 'approved'))
  );
create policy "admins manage wholesale prices" on public.wholesale_variant_prices
  for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());

insert into public.wholesale_variant_prices(variant_id, price)
select id, wholesale_price from public.product_variants where wholesale_price is not null
on conflict (variant_id) do update set price = excluded.price, updated_at = now();
-- Keep the legacy column during staging and rollout. Wholesale checkout and
-- admin pricing now use wholesale_variant_prices; retaining the old values
-- avoids destructive schema cleanup while the environment is being prepared.

create or replace function public.sync_wholesale_profile_from_application() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null then
    update public.profiles set wholesale_status = new.status, company_name = new.company_name,
      wholesale_moq = new.wholesale_moq, updated_at = now() where id = new.user_id and role = 'customer';
  end if;
  return new;
end;
$$;
create trigger wholesale_application_sync_profile
  after insert or update of status, user_id, company_name, wholesale_moq on public.wholesale_applications
  for each row execute function public.sync_wholesale_profile_from_application();

create or replace function public.link_verified_wholesale_application() returns trigger
language plpgsql security definer set search_path = '' as $$
declare application_id uuid;
begin
  if new.email_confirmed_at is null or new.email is null then return new; end if;
  insert into public.profiles(id, email, display_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''))
    on conflict (id) do update set email = excluded.email;
  select id into application_id from public.wholesale_applications
    where lower(email) = lower(new.email) and (user_id is null or user_id = new.id)
    order by created_at desc limit 1;
  if application_id is not null then
    update public.wholesale_applications set user_id = new.id, updated_at = now() where id = application_id;
  end if;
  return new;
end;
$$;
create trigger on_verified_wholesale_application_created after insert on auth.users
  for each row execute function public.link_verified_wholesale_application();
create trigger on_verified_wholesale_application_confirmed after update of email_confirmed_at on auth.users
  for each row when (new.email_confirmed_at is not null) execute function public.link_verified_wholesale_application();

drop function public.decide_wholesale_application(uuid, text, text);
create function public.decide_wholesale_application(p_id uuid, p_status text, p_notes text default '', p_wholesale_moq integer default 12)
returns public.wholesale_applications
language plpgsql security definer set search_path = '' as $$
declare result public.wholesale_applications;
begin
  if not public.is_dairi_admin() then raise exception 'Administrator access required.' using errcode = '42501'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Decision must be approved or rejected.' using errcode = '22023'; end if;
  if p_wholesale_moq < 1 or p_wholesale_moq > 1000 then raise exception 'MOQ must be between 1 and 1000.' using errcode = '22023'; end if;
  update public.wholesale_applications set status = p_status,
    decision_notes = left(coalesce(p_notes, ''), 2000), wholesale_moq = p_wholesale_moq,
    decided_at = now(), updated_at = now()
    where id = p_id and status = 'pending' returning * into result;
  if result.id is null then raise exception 'This application is no longer pending.' using errcode = 'P0001'; end if;
  return result;
end;
$$;
revoke all on function public.decide_wholesale_application(uuid,text,text,integer) from public;
grant execute on function public.decide_wholesale_application(uuid,text,text,integer) to authenticated;

drop function public.submit_unpaid_order(jsonb, jsonb);
create function public.submit_unpaid_order(p_customer jsonb, p_items jsonb, p_user_id uuid default null)
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
    jsonb_build_object('address', p_customer ->> 'address', 'city', p_customer ->> 'city', 'postalCode', p_customer ->> 'postalCode', 'country', p_customer ->> 'country'),
    'USD', v_subtotal, 0, 0, v_subtotal, 'pending') returning id into v_order_id;
  insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price, image, variant_id, sku, color)
  select v_order_id, line ->> 'product_id', line ->> 'product_name', line ->> 'size', (line ->> 'quantity')::integer,
    (line ->> 'unit_price')::numeric, line ->> 'image', (line ->> 'variant_id')::uuid, line ->> 'sku', line ->> 'color'
    from jsonb_array_elements(v_order_lines) line;
  update public.product_variants v set inventory_quantity = v.inventory_quantity - requested.quantity, updated_at = now()
    from (select (line ->> 'variant_id')::uuid as variant_id, sum((line ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_order_lines) line group by (line ->> 'variant_id')::uuid) requested
    where v.id = requested.variant_id;
  return jsonb_build_object('id', v_order_number, 'createdAt', now(), 'total', v_subtotal, 'status', 'pending', 'items', v_order_lines, 'currency', 'USD');
end;
$$;
revoke all on function public.submit_unpaid_order(jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.submit_unpaid_order(jsonb,jsonb,uuid) to service_role;
