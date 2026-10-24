create or replace function public.finish_transactional_email(p_event_id uuid, p_provider_message_id text default null, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_error is null then
    update public.transactional_email_outbox set status = 'sent', provider_message_id = p_provider_message_id,
      last_error = null, sent_at = now(), updated_at = now() where id = p_event_id and status = 'processing';
  else
    update public.transactional_email_outbox set status = 'failed',
      available_at = now() + make_interval(mins => least(240, power(2, least(attempts, 7))::integer)),
      last_error = left(p_error, 500), updated_at = now() where id = p_event_id and status = 'processing';
  end if;
end;
$$;
revoke all on function public.finish_transactional_email(uuid, text, text) from public, anon, authenticated;
grant execute on function public.finish_transactional_email(uuid, text, text) to service_role;
