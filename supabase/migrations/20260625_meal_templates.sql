-- Meal templates: personal saved meal combinations (klien-owned)

create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nama text not null,
  waktu_makan text check (waktu_makan in ('pagi', 'siang', 'malam', 'snack')),
  created_at timestamptz default now()
);

create index if not exists meal_templates_user_created_idx
  on public.meal_templates (user_id, created_at desc);

-- Cek kepemilikan meal_template untuk RLS meal_template_items
create or replace function public.meal_template_owned_by_me(p_template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meal_templates mt
    where mt.id = p_template_id
      and mt.user_id = (select auth.uid())
  );
$$;

create table if not exists public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  meal_template_id uuid references public.meal_templates(id) on delete cascade,
  nama_makanan text not null,
  jumlah numeric(6,2) not null,
  unit_id uuid references public.food_units(id),
  unit_nama text not null,
  kalori_estimasi numeric(8,2) default 0,
  karbohidrat numeric(8,2) default 0,
  protein numeric(8,2) default 0,
  lemak numeric(8,2) default 0,
  serat numeric(8,2) default 0,
  natrium numeric(8,2) default 0,
  created_at timestamptz default now()
);

create index if not exists meal_template_items_template_idx
  on public.meal_template_items (meal_template_id);

alter table public.meal_templates enable row level security;
alter table public.meal_template_items enable row level security;

-- meal_templates: klien can CRUD own templates; staff can only read.
drop policy if exists "meal_templates_klien" on public.meal_templates;
create policy "meal_templates_klien" on public.meal_templates
  for all using (auth.uid() = user_id);

drop policy if exists "meal_templates_staff_read" on public.meal_templates;
create policy "meal_templates_staff_read" on public.meal_templates
  for select using (public.jwt_is_staff());

-- meal_template_items: klien can CRUD items in own templates; staff can only read.
drop policy if exists "meal_template_items_klien" on public.meal_template_items;
create policy "meal_template_items_klien" on public.meal_template_items
  for all
  using (public.meal_template_owned_by_me(meal_template_id))
  with check (public.meal_template_owned_by_me(meal_template_id));

drop policy if exists "meal_template_items_staff_read" on public.meal_template_items;
create policy "meal_template_items_staff_read" on public.meal_template_items
  for select using (public.jwt_is_staff());

grant select, insert, update, delete on table public.meal_templates to authenticated;
grant select, insert, update, delete on table public.meal_template_items to authenticated;

revoke all on function public.meal_template_owned_by_me(uuid) from public;
grant execute on function public.meal_template_owned_by_me(uuid) to authenticated;
