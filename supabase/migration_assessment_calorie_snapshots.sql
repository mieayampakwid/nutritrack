-- Optional: run in Supabase SQL Editor after deploy.
-- Extends assessments for Harris–Benedict snapshot history (calorie needs page).

alter table public.assessments
  add column if not exists tanggal date,
  add column if not exists jenis_kelamin text,
  add column if not exists umur_tahun integer,
  add column if not exists berat_badan numeric(6,2),
  add column if not exists tinggi_badan numeric(6,2),
  add column if not exists bmr numeric(10,2);

comment on column public.assessments.tanggal is 'Date recorded for the calculation (calorie needs).';
comment on column public.assessments.bmr is 'Harris–Benedict BMR (kcal/day) at time of calculation.';
