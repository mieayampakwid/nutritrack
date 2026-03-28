-- Jalankan di Supabase → SQL Editor (atau: supabase db execute --file ... jika tersedia).
-- Memperbaiki INSERT ke food_log_items: policy lama memakai EXISTS ke food_logs di bawah
-- RLS subquery; di beberapa kasus baris log baru tidak terlihat saat WITH CHECK, sehingga
-- muncul "new row violates row-level security policy".

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

revoke all on function public.food_log_owned_by_me(uuid) from public;
grant execute on function public.food_log_owned_by_me(uuid) to authenticated;

drop policy if exists "food_items_klien" on public.food_log_items;
create policy "food_items_klien" on public.food_log_items
  for all
  using (public.food_log_owned_by_me(food_log_id))
  with check (public.food_log_owned_by_me(food_log_id));
