-- Wholesale applications are collected without taking payment. Decisions are
-- managed by DAIRI administrators; account linking can be added independently.
create table public.wholesale_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (length(company_name) between 2 and 200),
  contact_name text not null check (length(contact_name) between 2 and 200),
  email text not null,
  phone text not null default '',
  country text not null,
  website text not null default '',
  business_type text not null,
  annual_volume text not null default '',
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decision_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);
create index wholesale_applications_status_created on public.wholesale_applications(status, created_at desc);
create index wholesale_applications_email on public.wholesale_applications(lower(email));
alter table public.wholesale_applications enable row level security;
create policy "admins manage wholesale applications" on public.wholesale_applications
  for all to authenticated using (public.is_dairi_admin()) with check (public.is_dairi_admin());

create or replace function public.decide_wholesale_application(p_id uuid, p_status text, p_notes text default '')
returns public.wholesale_applications
language plpgsql security definer set search_path = '' as $$
declare result public.wholesale_applications;
begin
  if not public.is_dairi_admin() then raise exception 'Administrator access required.' using errcode = '42501'; end if;
  if p_status not in ('approved','rejected') then raise exception 'Decision must be approved or rejected.' using errcode = '22023'; end if;
  update public.wholesale_applications
    set status = p_status, decision_notes = left(coalesce(p_notes, ''), 2000), decided_at = now(), updated_at = now()
    where id = p_id and status = 'pending' returning * into result;
  if result.id is null then raise exception 'This application is no longer pending.' using errcode = 'P0001'; end if;
  return result;
end;
$$;
revoke all on function public.decide_wholesale_application(uuid,text,text) from public;
grant execute on function public.decide_wholesale_application(uuid,text,text) to authenticated;
