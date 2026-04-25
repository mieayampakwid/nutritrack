-- Hardening: prevent users from changing their own role or is_active flag.
-- Run in Supabase SQL Editor on existing projects.
-- Reflected in supabase/schema.sql for fresh installs.

drop policy if exists "profiles_self_update" on public.profiles;

create policy "profiles_self_update" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    AND role = (select p.role from public.profiles p where p.id = auth.uid())
    AND is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
  );
