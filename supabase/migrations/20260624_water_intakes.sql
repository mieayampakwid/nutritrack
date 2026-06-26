-- Water intake tracking: main table + audit table
create table if not exists public.water_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tanggal date not null default current_date,
  volume_ml integer not null check (volume_ml > 0 and volume_ml <= 10000),
  created_at timestamptz not null default now()
);

create index if not exists water_intakes_user_tanggal_idx
  on public.water_intakes (user_id, tanggal desc);

-- Audit table for water intake deletions (mirrors food_log_deletions / exercise_log_deletions)
create table if not exists public.water_intake_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  water_intake_id uuid not null,
  volume_ml integer not null,
  tanggal date not null,
  created_at timestamptz not null,
  deleted_at timestamptz default now()
);

-- RLS: main table — klien CRUD own; staff read only
alter table public.water_intakes enable row level security;

drop policy if exists "water_intakes_klien" on public.water_intakes;
create policy "water_intakes_klien" on public.water_intakes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "water_intakes_staff_read" on public.water_intakes;
create policy "water_intakes_staff_read" on public.water_intakes
  for select
  using (public.jwt_is_staff());

-- RLS: audit table — klien insert own; staff select
alter table public.water_intake_deletions enable row level security;

drop policy if exists "water_deletions_klien_insert" on public.water_intake_deletions;
create policy "water_deletions_klien_insert" on public.water_intake_deletions
  for insert with check (auth.uid() = user_id);

drop policy if exists "water_deletions_staff_select" on public.water_intake_deletions;
create policy "water_deletions_staff_select" on public.water_intake_deletions
  for select using (public.jwt_is_staff());

grant select, insert, update, delete on table public.water_intakes to authenticated;
grant select, insert on table public.water_intake_deletions to authenticated;
