-- Cancelling an unpaid order releases the stock reserved during submission.
create or replace function public.cancel_unpaid_order(p_order_number text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_status text;
begin
  if auth.role() <> 'service_role' and not public.is_dairi_admin() then
    raise exception using errcode = '42501', message = 'Administrator access is required.';
  end if;

  select id, status into v_order_id, v_status
  from public.orders where order_number = p_order_number for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Order not found.';
  end if;
  if v_status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'Only pending unpaid orders can be cancelled.';
  end if;

  update public.product_variants v
  set inventory_quantity = v.inventory_quantity + items.quantity,
      updated_at = now()
  from (
    select variant_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = v_order_id and variant_id is not null
    group by variant_id
  ) items
  where v.id = items.variant_id;

  update public.orders set status = 'cancelled', updated_at = now() where id = v_order_id;
  return 'cancelled';
end;
$$;
revoke all on function public.cancel_unpaid_order(text) from public, anon;
grant execute on function public.cancel_unpaid_order(text) to authenticated, service_role;
