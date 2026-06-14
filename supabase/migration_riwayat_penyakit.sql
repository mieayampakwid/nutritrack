-- Add riwayat_penyakit (medical history) column to profiles
alter table public.profiles add column if not exists riwayat_penyakit text;

-- Add riwayat_penyakit to anthropometric_change_log field check constraint
alter table public.anthropometric_change_log drop constraint if exists anthropometric_change_log_field_chk;
alter table public.anthropometric_change_log
  add constraint anthropometric_change_log_field_chk check (field in (
    'berat_badan', 'tinggi_badan', 'massa_otot', 'massa_lemak', 'lingkar_pinggang', 'bmi', 'energi_total', 'riwayat_penyakit'
  ));

-- Trigger to log riwayat_penyakit changes from profiles table
create or replace function public.trg_profiles_riwayat_penyakit_change_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_by uuid;
begin
  v_by := (select auth.uid());

  if old.riwayat_penyakit is distinct from new.riwayat_penyakit then
    perform public.append_antrop_change(new.id, 'riwayat_penyakit', old.riwayat_penyakit, new.riwayat_penyakit, v_by, 'profiles');
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_riwayat_penyakit_change_log_upd on public.profiles;
create trigger profiles_riwayat_penyakit_change_log_upd
  after update of riwayat_penyakit on public.profiles
  for each row
  when (old.riwayat_penyakit is distinct from new.riwayat_penyakit)
  execute procedure public.trg_profiles_riwayat_penyakit_change_log();

-- Add riwayat_penyakit to change log labels (update the view/helper)
-- This ensures the anthropometricChangeLogLabels helper includes it on the frontend
