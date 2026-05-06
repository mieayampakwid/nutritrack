-- US-EV09/US-EV10: exercise logs (Approach A)

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tanggal date not null,
  jenis_olahraga text not null,
  durasi text not null,
  created_at timestamptz not null default now()
);

create index if not exists exercise_logs_user_tanggal_created_at_idx
  on public.exercise_logs (user_id, tanggal desc, created_at desc);

alter table public.exercise_logs enable row level security;

drop policy if exists "exercise_logs_klien" on public.exercise_logs;
create policy "exercise_logs_klien" on public.exercise_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "exercise_logs_staff_read" on public.exercise_logs;
create policy "exercise_logs_staff_read" on public.exercise_logs
  for select
  using (public.jwt_is_staff());

grant select, insert, update, delete on table public.exercise_logs to authenticated;

