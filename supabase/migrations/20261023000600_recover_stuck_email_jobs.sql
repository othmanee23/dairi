create or replace function public.claim_transactional_email(p_event_id uuid)
returns setof public.transactional_email_outbox
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with candidate as (
    select e.id from public.transactional_email_outbox e
    where e.id = p_event_id and e.attempts < 8 and (
      (e.status in ('pending', 'failed') and e.available_at <= now())
      or (e.status = 'processing' and e.updated_at < now() - interval '10 minutes')
    )
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
