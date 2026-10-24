create table public.transactional_email_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_key text not null unique,
  event_type text not null check (event_type in ('order_confirmation', 'shipment_notification')),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index transactional_email_outbox_pending on public.transactional_email_outbox (available_at, created_at)
  where status in ('pending', 'failed');
alter table public.transactional_email_outbox enable row level security;
revoke all on public.transactional_email_outbox from anon, authenticated;
grant all on public.transactional_email_outbox to service_role;

create or replace function public.enqueue_order_confirmation_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.transactional_email_outbox (order_id, event_key, event_type, recipient)
  values (new.id, 'order-confirmation:' || new.id::text, 'order_confirmation', new.customer_email)
  on conflict (event_key) do nothing;
  return new;
end;
$$;
create trigger orders_queue_confirmation_email
  after insert on public.orders
  for each row execute function public.enqueue_order_confirmation_email();

create or replace function public.enqueue_shipment_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'shipped' and new.tracking_carrier is not null and new.tracking_number is not null
    and (old.status is distinct from new.status or old.tracking_carrier is distinct from new.tracking_carrier or old.tracking_number is distinct from new.tracking_number) then
    insert into public.transactional_email_outbox (order_id, event_key, event_type, recipient)
    values (new.id, 'shipment:' || new.id::text || ':' || new.tracking_carrier || ':' || new.tracking_number, 'shipment_notification', new.customer_email)
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger orders_queue_shipment_email
  after update of status, tracking_carrier, tracking_number on public.orders
  for each row execute function public.enqueue_shipment_email();

create function public.claim_transactional_email(p_event_id uuid)
returns setof public.transactional_email_outbox
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with candidate as (
    select e.id from public.transactional_email_outbox e
    where e.id = p_event_id and e.status in ('pending', 'failed') and e.available_at <= now() and e.attempts < 8
    for update skip locked
  )
  update public.transactional_email_outbox e
  set status = 'processing', attempts = e.attempts + 1, last_error = null, updated_at = now()
  from candidate where e.id = candidate.id
  returning e.*;
end;
$$;
revoke all on function public.claim_transactional_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_transactional_email(uuid) to service_role;

create function public.finish_transactional_email(p_event_id uuid, p_provider_message_id text default null, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_error is null then
    update public.transactional_email_outbox set status = 'sent', provider_message_id = p_provider_message_id,
      last_error = null, sent_at = now(), updated_at = now() where id = p_event_id and status = 'processing';
  else
    update public.transactional_email_outbox set status = 'failed',
      available_at = now() + make_interval(mins => least(240, 2 ^ least(attempts, 7))),
      last_error = left(p_error, 500), updated_at = now() where id = p_event_id and status = 'processing';
  end if;
end;
$$;
revoke all on function public.finish_transactional_email(uuid, text, text) from public, anon, authenticated;
grant execute on function public.finish_transactional_email(uuid, text, text) to service_role;
