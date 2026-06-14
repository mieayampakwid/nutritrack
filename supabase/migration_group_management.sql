-- migration_group_management.sql
-- Group management: admin assigns nutritionists to client groups

-- Groups table: one per nutritionist
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  ahli_gizi_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  constraint groups_ahli_gizi_uniq unique (ahli_gizi_id)
);

-- Group members table: maps clients to groups
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  klien_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz default now(),
  constraint group_members_klien_uniq unique (klien_id)
);

-- Indexes for performance
create index if not exists group_members_group_idx on public.group_members(group_id);
create index if not exists group_members_klien_idx on public.group_members(klien_id);

-- Enable RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- RLS: groups table
-- Admin full access
create policy "groups_admin" on public.groups
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Nutritionist read access
create policy "groups_ahli_gizi_read" on public.groups
  for select using ((select role from public.profiles where id = auth.uid()) = 'ahli_gizi');

-- No client access (implicit deny)

-- RLS: group_members table
-- Admin full access
create policy "group_members_admin" on public.group_members
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Nutritionist read all
create policy "group_members_ahli_gizi_read" on public.group_members
  for select using ((select role from public.profiles where id = auth.uid()) = 'ahli_gizi');

-- Nutritionist manage own group members
create policy "group_members_ahli_gizi_manage_own" on public.group_members
  for insert with check (
    exists (
      select 1 from public.groups g
      where g.id = group_id
        and g.ahli_gizi_id = auth.uid()
    )
  );

create policy "group_members_ahli_gizi_update_own" on public.group_members
  for update using (
    exists (
      select 1 from public.groups g
      where g.id = group_id
        and g.ahli_gizi_id = auth.uid()
    )
  );

create policy "group_members_ahli_gizi_delete_own" on public.group_members
  for delete using (
    exists (
      select 1 from public.groups g
      where g.id = group_id
        and g.ahli_gizi_id = auth.uid()
    )
  );

-- RPC function: admin_list_groups
create or replace function public.admin_list_groups()
returns table (
  id uuid,
  nama text,
  ahli_gizi_id uuid,
  ahli_gizi_nama text,
  member_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.nama,
    g.ahli_gizi_id,
    p.nama as ahli_gizi_nama,
    count(gm.klien_id) as member_count
  from public.groups g
  left join public.profiles p on p.id = g.ahli_gizi_id
  left join public.group_members gm on gm.group_id = g.id
  where (select role from public.profiles where id = auth.uid()) = 'admin'
  group by g.id, g.nama, g.ahli_gizi_id, p.nama
  order by g.created_at desc;
$$;

-- RPC function: admin_get_group_detail
create or replace function public.admin_get_group_detail(p_group_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', g.id,
    'nama', g.nama,
    'ahli_gizi_id', g.ahli_gizi_id,
    'ahli_gizi_nama', p.nama,
    'members', (
      select json_agg(json_build_object(
        'id', gm.id,
        'klien_id', gm.klien_id,
        'klien_nama', klien.nama,
        'klien_email', klien.email,
        'added_at', gm.added_at
      ))
      from public.group_members gm
      inner join public.profiles klien on klien.id = gm.klien_id
      where gm.group_id = g.id
      order by gm.added_at desc
    )
  )
  from public.groups g
  left join public.profiles p on p.id = g.ahli_gizi_id
  where g.id = p_group_id
    and (select role from public.profiles where id = auth.uid()) = 'admin';
$$;

-- RPC function: get_my_group (for nutritionist)
create or replace function public.get_my_group()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', g.id,
    'nama', g.nama,
    'members', (
      select json_agg(json_build_object(
        'id', gm.id,
        'klien_id', gm.klien_id,
        'klien_nama', klien.nama,
        'klien_email', klien.email
      ))
      from public.group_members gm
      inner join public.profiles klien on klien.id = gm.klien_id
      where gm.group_id = g.id
      order by klien.nama asc
    )
  )
  from public.groups g
  where g.ahli_gizi_id = auth.uid();
$$;

-- Grants
grant execute on function public.admin_list_groups() to authenticated;
grant execute on function public.admin_get_group_detail(uuid) to authenticated;
grant execute on function public.get_my_group() to authenticated;
