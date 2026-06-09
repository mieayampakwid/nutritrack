-- Audit table for exercise log deletions (mirrors food_log_deletions)
create table if not exists public.exercise_log_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  exercise_log_id uuid not null,
  jenis_olahraga text not null,
  deleted_at timestamptz default now()
);

-- RLS: klien can insert their own deletions; staff can select.
alter table public.exercise_log_deletions enable row level security;

drop policy if exists "exercise_deletions_klien_insert" on public.exercise_log_deletions;
create policy "exercise_deletions_klien_insert" on public.exercise_log_deletions
  for insert with check (auth.uid() = user_id);

drop policy if exists "exercise_deletions_staff_select" on public.exercise_log_deletions;
create policy "exercise_deletions_staff_select" on public.exercise_log_deletions
  for select using (public.jwt_is_staff());

grant select, insert on table public.exercise_log_deletions to authenticated;
