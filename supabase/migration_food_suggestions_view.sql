-- Fix food_name_suggestions to enforce RLS via security_invoker.
-- Without this, the view bypasses RLS and exposes all users' food names.
-- Run in Supabase SQL Editor on existing projects.
-- Reflected in supabase/schema.sql for fresh installs.

drop view if exists public.food_name_suggestions;

create view public.food_name_suggestions
  with (security_invoker = true)
as
  select nama_makanan, count(*)::bigint as frekuensi
  from public.food_log_items
  group by nama_makanan
  order by frekuensi desc;

grant select on public.food_name_suggestions to authenticated;
