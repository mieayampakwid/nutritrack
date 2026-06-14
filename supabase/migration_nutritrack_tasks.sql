-- NutriTrack tasks (2026-04): run in Supabase SQL Editor on existing projects.
-- Also reflected in supabase/schema.sql for fresh installs.
--
-- After this file, run migration_handle_new_user_tgl_phone.sql so signUp metadata
-- maps tgl_lahir into profiles (optional but recommended).

-- 1) Allow multiple food log entries per day per meal slot (timestamp-based categorization).
alter table public.food_logs drop constraint if exists food_logs_user_id_tanggal_waktu_makan_key;

create index if not exists food_logs_user_tanggal_created_idx
  on public.food_logs (user_id, tanggal desc, created_at desc);

-- 2) Profile fields for staff data entry, demographics.
alter table public.profiles add column if not exists berat_badan numeric(6,2);
alter table public.profiles add column if not exists tinggi_badan numeric(6,2);
alter table public.profiles add column if not exists tgl_lahir date;
alter table public.profiles add column if not exists jenis_kelamin text;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'profiles' and c.conname = 'profiles_jenis_kelamin_check'
  ) then
    alter table public.profiles
      add constraint profiles_jenis_kelamin_check
      check (jenis_kelamin is null or jenis_kelamin in ('male', 'female'));
  end if;
end $$;

-- 3) Clinical energy assessment (Harris-Benedict factors + stored total at time of save).
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  faktor_aktivitas numeric(6,3) not null,
  faktor_stres numeric(6,3) not null,
  energi_total numeric(10,2) not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists assessments_user_created_idx
  on public.assessments (user_id, created_at desc);

alter table public.assessments enable row level security;

drop policy if exists "assessments_klien_select" on public.assessments;
create policy "assessments_klien_select" on public.assessments
  for select using (auth.uid() = user_id);

drop policy if exists "assessments_staff_all" on public.assessments;
create policy "assessments_staff_all" on public.assessments
  for all using (public.jwt_is_staff());

grant select, insert, update, delete on public.assessments to authenticated;
