-- GiziTrack RS — jalankan di Supabase SQL Editor
-- Setelah migrasi: aktifkan "Confirm email" di Auth agar signUp dari panel admin tidak mengganti sesi admin.

-- Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nama text not null,
  email text not null,
  nomor_wa text,
  instalasi text,
  role text check (role in ('admin', 'ahli_gizi', 'klien')) not null default 'klien',
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  tanggal date not null,
  berat_badan numeric(5,2),
  tinggi_badan numeric(5,2),
  massa_otot numeric(5,2),
  massa_lemak numeric(5,2),
  bmi numeric(5,2),
  catatan text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique(user_id, tanggal)
);

create table if not exists public.food_units (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

insert into public.food_units (nama)
values
  ('centong'), ('sendok teh'), ('sendok makan'),
  ('potong'), ('gelas'), ('buah'), ('lembar'), ('bungkus')
on conflict (nama) do nothing;

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  tanggal date not null,
  waktu_makan text check (waktu_makan in ('pagi', 'siang', 'malam', 'snack')) not null,
  total_kalori numeric(8,2) default 0,
  status text check (status in ('saved')) default 'saved',
  created_at timestamptz default now(),
  unique(user_id, tanggal, waktu_makan)
);

create table if not exists public.food_log_items (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid references public.food_logs(id) on delete cascade,
  nama_makanan text not null,
  jumlah numeric(6,2) not null,
  unit_id uuid references public.food_units(id),
  unit_nama text not null,
  kalori_estimasi numeric(8,2) default 0,
  created_at timestamptz default now()
);

create or replace view public.food_name_suggestions as
select nama_makanan, count(*)::bigint as frekuensi
from public.food_log_items
group by nama_makanan
order by frekuensi desc;

-- Trigger: profil dari metadata saat user auth dibuat (signUp / invite)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'klien');
  if r not in ('admin', 'ahli_gizi', 'klien') then
    r := 'klien';
  end if;
  insert into public.profiles (id, nama, email, nomor_wa, instalasi, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data->>'nomor_wa'), ''),
    nullif(trim(new.raw_user_meta_data->>'instalasi'), ''),
    r
  )
  on conflict (id) do update set
    nama = excluded.nama,
    email = excluded.email,
    nomor_wa = coalesce(excluded.nomor_wa, public.profiles.nomor_wa),
    instalasi = coalesce(excluded.instalasi, public.profiles.instalasi),
    role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Cek peran staff tanpa subquery RLS ke profiles (hindari infinite recursion)
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

-- Cek kepemilikan food_log untuk RLS food_log_items (hindari subquery RLS ke food_logs saat INSERT)
create or replace function public.food_log_owned_by_me(p_food_log_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.food_logs fl
    where fl.id = p_food_log_id
      and fl.user_id = (select auth.uid())
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.body_measurements enable row level security;
alter table public.food_logs enable row level security;
alter table public.food_log_items enable row level security;
alter table public.food_units enable row level security;

drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_staff" on public.profiles;
create policy "profiles_staff" on public.profiles
  for all using (public.jwt_is_staff());

drop policy if exists "measurements_klien_read" on public.body_measurements;
create policy "measurements_klien_read" on public.body_measurements
  for select using (auth.uid() = user_id);

drop policy if exists "measurements_staff" on public.body_measurements;
create policy "measurements_staff" on public.body_measurements
  for all using (public.jwt_is_staff());

drop policy if exists "foodlogs_klien" on public.food_logs;
create policy "foodlogs_klien" on public.food_logs
  for all using (auth.uid() = user_id);

drop policy if exists "foodlogs_staff_read" on public.food_logs;
create policy "foodlogs_staff_read" on public.food_logs
  for select using (public.jwt_is_staff());

drop policy if exists "food_items_klien" on public.food_log_items;
create policy "food_items_klien" on public.food_log_items
  for all
  using (public.food_log_owned_by_me(food_log_id))
  with check (public.food_log_owned_by_me(food_log_id));

drop policy if exists "food_items_staff_read" on public.food_log_items;
create policy "food_items_staff_read" on public.food_log_items
  for select using (public.jwt_is_staff());

drop policy if exists "food_units_read" on public.food_units;
create policy "food_units_read" on public.food_units
  for select using (auth.role() = 'authenticated');

drop policy if exists "food_units_staff" on public.food_units;
create policy "food_units_staff" on public.food_units
  for all using (public.jwt_is_staff());

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.food_name_suggestions to authenticated;
revoke all on function public.jwt_is_staff() from public;
grant execute on function public.jwt_is_staff() to authenticated;

revoke all on function public.food_log_owned_by_me(uuid) from public;
grant execute on function public.food_log_owned_by_me(uuid) to authenticated;
