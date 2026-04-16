-- Routine evaluations shown to clients on /klien/progress (staff insert from food-logs or ringkasan modal).
-- Run in Supabase → SQL Editor if you see: "Could not find the table 'public.user_evaluations' in the schema cache".

create table if not exists public.user_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  exercise_freq text,
  sleep_enough boolean,
  veg_times_per_day numeric(6,2),
  usage_notes text,
  bmi numeric(5,2),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists user_evaluations_user_date_to_idx
  on public.user_evaluations (user_id, date_to desc, created_at desc);

alter table public.user_evaluations enable row level security;

drop policy if exists "user_evaluations_klien_select" on public.user_evaluations;
create policy "user_evaluations_klien_select" on public.user_evaluations
  for select using (auth.uid() = user_id);

drop policy if exists "user_evaluations_staff_all" on public.user_evaluations;
create policy "user_evaluations_staff_all" on public.user_evaluations
  for all using (public.jwt_is_staff());

grant select, insert, update, delete on public.user_evaluations to authenticated;
