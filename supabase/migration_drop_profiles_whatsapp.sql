-- Drop legacy WhatsApp fields from profiles; use auth.users.phone only.
--
-- This migration is destructive: it permanently removes data in these columns.

alter table public.profiles drop column if exists nomor_wa;
alter table public.profiles drop column if exists phone_whatsapp;

-- Update handle_new_user so it no longer references removed columns.
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

  insert into public.profiles (
    id,
    nama,
    email,
    instalasi,
    role,
    is_active,
    tgl_lahir,
    jenis_kelamin,
    berat_badan,
    tinggi_badan
  )
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

-- Staff-only RPC for reading phone (source of truth: auth.users.phone).
create or replace function public.admin_get_user_phone(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.jwt_is_staff() then
    raise exception 'forbidden';
  end if;

  return (select u.phone from auth.users u where u.id = p_user_id);
end;
$$;

grant execute on function public.admin_get_user_phone(uuid) to authenticated;

-- Staff-only RPC for listing profiles with phone for admin UI/search.
create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  nama text,
  email text,
  instalasi text,
  role text,
  is_active boolean,
  created_at timestamptz,
  berat_badan numeric,
  tinggi_badan numeric,
  tgl_lahir date,
  jenis_kelamin text,
  phone text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    p.nama,
    p.email,
    p.instalasi,
    p.role,
    p.is_active,
    p.created_at,
    p.berat_badan,
    p.tinggi_badan,
    p.tgl_lahir,
    p.jenis_kelamin,
    u.phone
  from public.profiles p
  left join auth.users u on u.id = p.id
  where public.jwt_is_staff()
  order by p.created_at desc;
$$;

grant execute on function public.admin_list_profiles() to authenticated;

