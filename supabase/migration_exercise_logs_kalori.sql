alter table public.exercise_logs
  add column if not exists kalori_estimasi numeric(8,2) default 0;
