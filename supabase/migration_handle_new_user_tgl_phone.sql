-- Extend handle_new_user to map tgl_lahir from auth metadata (signUp / invite).
-- Requires profiles columns from migration_nutritrack_tasks.sql (tgl_lahir).

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
  insert into public.profiles (id, nama, email, instalasi, role, tgl_lahir)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(new.raw_user_meta_data->>'instalasi'), ''),
    r,
    case
      when trim(coalesce(new.raw_user_meta_data->>'tgl_lahir', '')) ~ '^\d{4}-\d{2}-\d{2}$'
        then trim(new.raw_user_meta_data->>'tgl_lahir')::date
      else null
    end
  )
  on conflict (id) do update set
    nama = excluded.nama,
    email = excluded.email,
    instalasi = coalesce(excluded.instalasi, public.profiles.instalasi),
    role = excluded.role,
    tgl_lahir = coalesce(excluded.tgl_lahir, public.profiles.tgl_lahir);
  return new;
end;
$$;
