-- Security definer function to read profile names bypassing RLS.
-- Fixes BUG-03: klien cannot see staff names due to profiles_self RLS policy.
CREATE OR REPLACE FUNCTION get_profile_names(profile_ids uuid[])
RETURNS TABLE(id uuid, nama text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.nama FROM public.profiles p WHERE p.id = ANY(profile_ids);
$$;
