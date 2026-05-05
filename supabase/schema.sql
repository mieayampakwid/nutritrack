-- GiziTrack RS — jalankan di Supabase SQL Editor
-- Setelah migrasi: aktifkan "Confirm email" di Auth agar signUp dari panel admin tidak mengganti sesi admin.

-- Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nama text not null,
  email text not null,
  instalasi text,
  role text check (role in ('admin', 'ahli_gizi', 'klien')) not null default 'klien',
  is_active boolean not null default true,
  created_at timestamptz default now(),
  berat_badan numeric(6,2),
  tinggi_badan numeric(6,2),
  tgl_lahir date,
  jenis_kelamin text check (jenis_kelamin is null or jenis_kelamin in ('male', 'female')),
  -- WhatsApp/phone is stored in auth.users.phone (not in profiles).
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  tanggal date not null,
  berat_badan numeric(5,2),
  tinggi_badan numeric(5,2),
  massa_otot numeric(5,2),
  massa_lemak numeric(5,2),
  lingkar_pinggang numeric(6,2),
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
  created_at timestamptz default now()
);

create index if not exists food_logs_user_tanggal_idx on public.food_logs (user_id, tanggal desc);
create index if not exists food_logs_user_tanggal_created_idx on public.food_logs (user_id, tanggal desc, created_at desc);

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

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  faktor_aktivitas numeric(6,3) not null,
  faktor_stres numeric(6,3) not null,
  energi_total numeric(10,2) not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists assessments_user_created_idx on public.assessments (user_id, created_at desc);

create table if not exists public.user_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  exercise_freq text,
  sleep_enough boolean,
  veg_times_per_day numeric(6,2),
  usage_notes text,
  recommendations text,
  bmi numeric(5,2),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists user_evaluations_user_date_to_idx
  on public.user_evaluations (user_id, date_to desc, created_at desc);

create table public.anthropometric_change_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.profiles(id),
  source text not null,
  constraint anthropometric_change_log_field_chk check (field in (
    'berat_badan', 'tinggi_badan', 'massa_otot', 'massa_lemak', 'lingkar_pinggang', 'bmi', 'energi_total'
  )),
  constraint anthropometric_change_log_source_chk check (source in (
    'body_measurements', 'assessments', 'profiles'
  ))
);

create index anthropometric_change_log_user_changed_idx
  on public.anthropometric_change_log (user_id, changed_at desc);

create or replace view public.food_name_suggestions
  with (security_invoker = true)
as
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
  v_is_active boolean;
  v_berat numeric;
  v_tinggi numeric;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'klien');
  if r not in ('admin', 'ahli_gizi', 'klien') then
    r := 'klien';
  end if;

  v_is_active := false;

  v_berat := nullif(trim(coalesce(new.raw_user_meta_data->>'berat_badan', '')), '')::numeric;
  v_tinggi := nullif(trim(coalesce(new.raw_user_meta_data->>'tinggi_badan', '')), '')::numeric;

  insert into public.profiles (id, nama, email, instalasi, role, is_active, tgl_lahir, jenis_kelamin, berat_badan, tinggi_badan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data->>'instalasi'), ''),
    r,
    v_is_active,
    case
      when trim(coalesce(new.raw_user_meta_data->>'tgl_lahir', '')) ~ '^\d{4}-\d{2}-\d{2}$'
        then trim(new.raw_user_meta_data->>'tgl_lahir')::date
      else null
    end,
    nullif(trim(coalesce(new.raw_user_meta_data->>'jenis_kelamin', '')), ''),
    v_berat,
    v_tinggi
  )
  on conflict (id) do update set
    nama = excluded.nama,
    email = excluded.email,
    instalasi = coalesce(excluded.instalasi, public.profiles.instalasi),
    role = excluded.role,
    is_active = coalesce(excluded.is_active, public.profiles.is_active),
    tgl_lahir = coalesce(excluded.tgl_lahir, public.profiles.tgl_lahir),
    jenis_kelamin = coalesce(excluded.jenis_kelamin, public.profiles.jenis_kelamin),
    berat_badan = coalesce(excluded.berat_badan, public.profiles.berat_badan),
    tinggi_badan = coalesce(excluded.tinggi_badan, public.profiles.tinggi_badan);

  -- Insert first anthropometric measurement on registration
  if (v_berat is not null or v_tinggi is not null) then
    insert into public.body_measurements (user_id, tanggal, berat_badan, tinggi_badan, created_by)
    values (new.id, current_date, v_berat, v_tinggi, new.id)
    on conflict (user_id, tanggal) do nothing;
  end if;

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

-- Anthropometric change log (Sprint 2): internal writers + triggers
create or replace function public.append_antrop_change(
  p_user_id uuid,
  p_field text,
  p_old text,
  p_new text,
  p_changed_by uuid,
  p_source text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_old is not distinct from p_new then
    return;
  end if;
  insert into public.anthropometric_change_log (user_id, field, old_value, new_value, changed_by, source)
  values (p_user_id, p_field, p_old, p_new, p_changed_by, p_source);
end;
$$;

revoke all on function public.append_antrop_change(uuid, text, text, text, uuid, text) from public;

create or replace function public.bmi_from_bb_tb(bb numeric, tb numeric)
returns numeric
language sql
immutable
as $$
  select case
    when bb is null or tb is null or bb <= 0 or tb <= 0 then null
    else round((bb / power(tb / 100.0, 2))::numeric, 2)
  end;
$$;

revoke all on function public.bmi_from_bb_tb(numeric, numeric) from public;
grant execute on function public.bmi_from_bb_tb(numeric, numeric) to authenticated;

create or replace function public.trg_body_measurements_change_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_by uuid;
  o record;
  n record;
begin
  v_by := coalesce(new.created_by, (select auth.uid()));

  if tg_op = 'INSERT' then
    perform public.append_antrop_change(new.user_id, 'berat_badan', null::text, new.berat_badan::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'tinggi_badan', null::text, new.tinggi_badan::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'massa_otot', null::text, new.massa_otot::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'massa_lemak', null::text, new.massa_lemak::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'lingkar_pinggang', null::text, new.lingkar_pinggang::text, v_by, 'body_measurements');
    perform public.append_antrop_change(new.user_id, 'bmi', null::text, new.bmi::text, v_by, 'body_measurements');
  else
    o := old;
    n := new;
    perform public.append_antrop_change(n.user_id, 'berat_badan', o.berat_badan::text, n.berat_badan::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'tinggi_badan', o.tinggi_badan::text, n.tinggi_badan::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'massa_otot', o.massa_otot::text, n.massa_otot::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'massa_lemak', o.massa_lemak::text, n.massa_lemak::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'lingkar_pinggang', o.lingkar_pinggang::text, n.lingkar_pinggang::text, v_by, 'body_measurements');
    perform public.append_antrop_change(n.user_id, 'bmi', o.bmi::text, n.bmi::text, v_by, 'body_measurements');
  end if;

  return coalesce(new, old);
end;
$$;

create trigger body_measurements_change_log_ins
  after insert on public.body_measurements
  for each row execute procedure public.trg_body_measurements_change_log();

create trigger body_measurements_change_log_upd
  after update on public.body_measurements
  for each row execute procedure public.trg_body_measurements_change_log();

create or replace function public.trg_assessments_change_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_antrop_change(
      new.user_id,
      'energi_total',
      null::text,
      new.energi_total::text,
      coalesce(new.created_by, (select auth.uid())),
      'assessments'
    );
  end if;
  return new;
end;
$$;

create trigger assessments_change_log_ins
  after insert on public.assessments
  for each row execute procedure public.trg_assessments_change_log();

create or replace function public.trg_profiles_antrop_change_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_by uuid;
  o_bmi numeric;
  n_bmi numeric;
begin
  if new.role is distinct from 'klien' then
    return new;
  end if;

  v_by := (select auth.uid());

  if old.berat_badan is distinct from new.berat_badan then
    perform public.append_antrop_change(new.id, 'berat_badan', old.berat_badan::text, new.berat_badan::text, v_by, 'profiles');
  end if;

  if old.tinggi_badan is distinct from new.tinggi_badan then
    perform public.append_antrop_change(new.id, 'tinggi_badan', old.tinggi_badan::text, new.tinggi_badan::text, v_by, 'profiles');
  end if;

  if old.berat_badan is distinct from new.berat_badan or old.tinggi_badan is distinct from new.tinggi_badan then
    o_bmi := public.bmi_from_bb_tb(old.berat_badan, old.tinggi_badan);
    n_bmi := public.bmi_from_bb_tb(new.berat_badan, new.tinggi_badan);
    perform public.append_antrop_change(new.id, 'bmi', o_bmi::text, n_bmi::text, v_by, 'profiles');
  end if;

  return new;
end;
$$;

create trigger profiles_antrop_change_log_upd
  after update of berat_badan, tinggi_badan on public.profiles
  for each row
  when (
    old.berat_badan is distinct from new.berat_badan
    or old.tinggi_badan is distinct from new.tinggi_badan
  )
  execute procedure public.trg_profiles_antrop_change_log();

-- RLS
alter table public.profiles enable row level security;
alter table public.body_measurements enable row level security;
alter table public.food_logs enable row level security;
alter table public.food_log_items enable row level security;
alter table public.food_units enable row level security;
alter table public.assessments enable row level security;
alter table public.user_evaluations enable row level security;
alter table public.anthropometric_change_log enable row level security;

drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    AND role = (select p.role from public.profiles p where p.id = auth.uid())
    AND is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "profiles_staff" on public.profiles;
create policy "profiles_staff" on public.profiles
  for all using (public.jwt_is_staff());

drop policy if exists "measurements_klien_read" on public.body_measurements;
create policy "measurements_klien_read" on public.body_measurements
  for select using (auth.uid() = user_id);

drop policy if exists "measurements_staff" on public.body_measurements;
create policy "measurements_staff" on public.body_measurements
  for all using (public.jwt_is_staff());

-- food_logs: klien can CRUD own logs; staff can only read (monitoring, not data entry).
drop policy if exists "foodlogs_klien" on public.food_logs;
create policy "foodlogs_klien" on public.food_logs
  for all using (auth.uid() = user_id);

drop policy if exists "foodlogs_staff_read" on public.food_logs;
create policy "foodlogs_staff_read" on public.food_logs
  for select using (public.jwt_is_staff());

-- food_log_items: klien can CRUD items in own logs; staff can only read.
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

drop policy if exists "assessments_klien_select" on public.assessments;
create policy "assessments_klien_select" on public.assessments
  for select using (auth.uid() = user_id);

drop policy if exists "assessments_staff_all" on public.assessments;
create policy "assessments_staff_all" on public.assessments
  for all using (public.jwt_is_staff());

drop policy if exists "user_evaluations_klien_select" on public.user_evaluations;
create policy "user_evaluations_klien_select" on public.user_evaluations
  for select using (auth.uid() = user_id);

drop policy if exists "user_evaluations_staff_all" on public.user_evaluations;
create policy "user_evaluations_staff_all" on public.user_evaluations
  for all using (public.jwt_is_staff());

drop policy if exists "anthropometric_change_log_klien_select" on public.anthropometric_change_log;
create policy "anthropometric_change_log_klien_select" on public.anthropometric_change_log
  for select using (auth.uid() = user_id);

drop policy if exists "anthropometric_change_log_staff_all" on public.anthropometric_change_log;
create policy "anthropometric_change_log_staff_all" on public.anthropometric_change_log
  for all using (public.jwt_is_staff());

-- GRANTS
-- The `anon` role requires schema usage for Supabase PostgREST to function,
-- but all RLS policies require auth.uid() or authenticated role.
-- No table data is accessible without a valid JWT.
-- Audit date: 2026-04-22
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.food_name_suggestions to authenticated;
revoke all on function public.jwt_is_staff() from public;
grant execute on function public.jwt_is_staff() to authenticated;

revoke all on function public.food_log_owned_by_me(uuid) from public;
grant execute on function public.food_log_owned_by_me(uuid) to authenticated;
