alter table public.orders
  add column tracking_carrier text,
  add column tracking_number text,
  add column shipped_at timestamptz,
  add constraint orders_tracking_pair_check check (
    (tracking_carrier is null and tracking_number is null)
    or (nullif(btrim(tracking_carrier), '') is not null and nullif(btrim(tracking_number), '') is not null)
  );
