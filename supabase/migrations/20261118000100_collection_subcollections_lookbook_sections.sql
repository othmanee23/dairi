-- Add a normalized collection hierarchy without removing legacy product fields.
create table public.subcollections (
  id text primary key,
  collection_id text not null references public.collections(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, name)
);

alter table public.products
  add column collection_id text references public.collections(id) on delete set null,
  add column subcollection_id text references public.subcollections(id) on delete set null,
  add column product_length text,
  add column product_width text,
  add column sleeve_type text,
  add column inseam text;

-- Preserve existing collection assignments while keeping the old text field in place
-- for storefront and older client compatibility.
update public.products p
set collection_id = c.id
from public.collections c
where p.collection_id is null
  and p.collection = c.name;

create index products_collection_hierarchy on public.products (collection_id, subcollection_id);
create index subcollections_collection_order on public.subcollections (collection_id, sort_order, name);

alter table public.lookbooks
  add column sections jsonb not null default '[]'::jsonb
  check (jsonb_typeof(sections) = 'array');

alter table public.subcollections enable row level security;
create policy "admins manage subcollections" on public.subcollections
  for all to authenticated
  using (public.is_dairi_admin())
  with check (public.is_dairi_admin());
