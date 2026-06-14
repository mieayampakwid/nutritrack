-- Jalankan di Supabase → SQL Editor.
-- 1) Kolom is_active
-- 2) Hindari "infinite recursion" pada RLS: policy staff tidak boleh pakai
--    EXISTS (SELECT ... FROM profiles) karena memicu evaluasi RLS profiles lagi.

alter table public.profiles
  add column if not exists is_active boolean not null default true;

create or replace function public.jwt_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role in ('admin', 'ahli_gizi') from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

revoke all on function public.jwt_is_staff() from public;
grant execute on function public.jwt_is_staff() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update
  using (auth.uid() = id);

drop policy if exists "profiles_staff" on public.profiles;
create policy "profiles_staff" on public.profiles
  for all
  using (public.jwt_is_staff());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;

-- Tabel lain (sama pola EXISTS → recursion saat menyentuh staff). Abaikan baris jika tabel belum ada.
drop policy if exists "measurements_staff" on public.body_measurements;
create policy "measurements_staff" on public.body_measurements
  for all
  using (public.jwt_is_staff());

drop policy if exists "foodlogs_staff_read" on public.food_logs;
create policy "foodlogs_staff_read" on public.food_logs
  for select
  using (public.jwt_is_staff());

drop policy if exists "food_items_staff_read" on public.food_log_items;
create policy "food_items_staff_read" on public.food_log_items
  for select
  using (public.jwt_is_staff());

drop policy if exists "food_units_staff" on public.food_units;
create policy "food_units_staff" on public.food_units
  for all
  using (public.jwt_is_staff());
