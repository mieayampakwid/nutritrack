-- Sprint 2: waist on measurements, anthropometric change log + triggers, evaluation recommendations.
-- Run in Supabase SQL Editor on existing projects. Fresh installs: use supabase/schema.sql.

alter table public.body_measurements
  add column if not exists lingkar_pinggang numeric(6,2);

alter table public.user_evaluations
  add column if not exists recommendations text;

-- --- Change log ---

create table if not exists public.anthropometric_change_log (
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

create index if not exists anthropometric_change_log_user_changed_idx
  on public.anthropometric_change_log (user_id, changed_at desc);

alter table public.anthropometric_change_log enable row level security;

drop policy if exists "anthropometric_change_log_klien_select" on public.anthropometric_change_log;
create policy "anthropometric_change_log_klien_select" on public.anthropometric_change_log
  for select using (auth.uid() = user_id);

drop policy if exists "anthropometric_change_log_staff_all" on public.anthropometric_change_log;
create policy "anthropometric_change_log_staff_all" on public.anthropometric_change_log
  for all using (public.jwt_is_staff());

grant select, insert, update, delete on public.anthropometric_change_log to authenticated;

-- Internal: append one row if values differ (security definer so trigger bypasses RLS on insert).
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

drop trigger if exists body_measurements_change_log_ins on public.body_measurements;
create trigger body_measurements_change_log_ins
  after insert on public.body_measurements
  for each row execute procedure public.trg_body_measurements_change_log();

drop trigger if exists body_measurements_change_log_upd on public.body_measurements;
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

drop trigger if exists assessments_change_log_ins on public.assessments;
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

drop trigger if exists profiles_antrop_change_log_upd on public.profiles;
create trigger profiles_antrop_change_log_upd
  after update of berat_badan, tinggi_badan on public.profiles
  for each row
  when (
    old.berat_badan is distinct from new.berat_badan
    or old.tinggi_badan is distinct from new.tinggi_badan
  )
  execute procedure public.trg_profiles_antrop_change_log();

grant select, insert, update, delete on public.anthropometric_change_log to authenticated;
