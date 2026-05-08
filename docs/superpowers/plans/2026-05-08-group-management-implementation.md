# Group Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin creates named groups that assign one nutritionist to multiple clients; nutritionists can read all clients but only manage their own group's members.

**Architecture:** Two new Postgres tables (`groups`, `group_members`) with RLS policies, three RPC functions, new admin page at `/admin/groups`, new nutritionist page at `/gizi/my-group`, and hooks for data fetching.

**Tech Stack:** Supabase (Postgres, RLS, RPC), React 19.2.4, TanStack Query 5.95.2, Tailwind CSS 4.2.2, Vitest

---

## Task 1: Database Migration — Tables and RLS

**Files:**
- Create: `supabase/migration_group_management.sql`

- [ ] **Step 1: Create the migration file with tables, RLS, and RPC functions**

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migration_group_management.sql
git commit -m "feat: add group management migration with tables, RLS, and RPC functions"
```

---

## Task 2: Update AppShell — Add "Grup Saya" for Nutritionists

**Files:**
- Modify: `src/components/layout/AppShell.jsx:80-93`

- [ ] **Step 1: Add "Grup Saya" link to nutritionist navigation**

Find the `ROLE_NAV` object in AppShell.jsx and update the `ahli_gizi.more` array:

```javascript
const ROLE_NAV = {
  admin: {
    primary: [
      { to: '/admin/dashboard', label: 'Dasbor', icon: LayoutDashboard },
      { to: '/admin/all-clients', label: 'Klien', icon: Users },
      { to: '/admin/users', label: 'User', icon: Users },
    ],
    more: [
      { to: '/admin/import', label: 'Impor', icon: Upload },
      { to: '/admin/food-units', label: 'Master ukuran', icon: Settings2 },
    ],
  },
  ahli_gizi: {
    primary: [
      { to: '/gizi/dashboard', label: 'Dasbor', icon: LayoutDashboard },
      { to: '/gizi/clients', label: 'Klien', icon: Users },
    ],
    more: [
      { to: '/gizi/my-group', label: 'Grup Saya', icon: Users },
    ],
  },
  klien: {
    primary: [
      { to: '/klien/dashboard', label: 'Dasbor', icon: LayoutDashboard },
      { to: '/klien/food-entry', label: 'Diary', icon: Apple },
      { to: '/klien/progress', label: 'Progres', icon: Ruler },
    ],
    more: [],
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/AppShell.jsx
git commit -m "feat: add Grup Saya link to nutritionist navigation"
```

---

## Task 3: Add Routes to App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add lazy imports for new pages**

Add these imports near the other admin/ahli_gizi lazy imports (around line 45):

```javascript
const AdminGroups = lazy(() =>
  import('@/pages/admin/AdminGroups').then((m) => ({ default: m.AdminGroups })),
)
const GiziMyGroup = lazy(() =>
  import('@/pages/ahli-gizi/GiziMyGroup').then((m) => ({ default: m.GiziMyGroup })),
)
```

- [ ] **Step 2: Add admin groups route**

Add this route inside the admin section (after `/admin/evaluation` route, around line 180):

```javascript
<Route
  path="/admin/groups"
  element={
    <RequireAuth roles={['admin']}>
      <AdminGroups />
    </RequireAuth>
  }
/>
```

- [ ] **Step 3: Add nutritionist my-group route**

Add this route inside the ahli_gizi section (after `/gizi/evaluation` route, around line 220):

```javascript
<Route
  path="/gizi/my-group"
  element={
    <RequireAuth roles={['ahli_gizi']}>
      <GiziMyGroup />
    </RequireAuth>
  }
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add routes for admin groups and nutritionist my-group"
```

---

## Task 4: Create Group Validator

**Files:**
- Modify: `src/lib/validators.js`

- [ ] **Step 1: Add group validation schema**

Add to the end of validators.js:

```javascript
export const groupCreateSchema = z.object({
  nama: z.string().min(1, 'Nama grup wajib diisi').max(100),
  ahli_gizi_id: z.string().uuid('Pilih ahli gizi'),
})
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validators.js
git commit -m "feat: add group validation schema"
```

---

## Task 5: Create Admin Hooks

**Files:**
- Create: `src/hooks/useAdminGroups.js`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useAdminGroups.test.js`:

```javascript
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/queryWrapper'

const { resultRef, chain } = vi.hoisted(() => {
  const resultRef = { current: { data: [], error: null } }
  const target = {}
  const proxied = new Proxy(target, {
    get(t, prop) {
      if (prop === 'then') return (resolve) => resolve(resultRef.current)
      if (!t[prop]) t[prop] = vi.fn().mockReturnValue(proxied)
      return t[prop]
    },
  })
  return { resultRef, chain: proxied }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: () => chain },
}))

import { useAdminGroups } from './useAdminGroups'

describe('useAdminGroups', () => {
  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('returns data from admin_list_groups RPC', async () => {
    const mockGroups = [
      { id: 'g1', nama: 'Grup A', ahli_gizi_nama: 'Dr. Budi', member_count: 5 },
      { id: 'g2', nama: 'Grup B', ahli_gizi_nama: 'Dr. Siti', member_count: 3 },
    ]
    resultRef.current = { data: mockGroups, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useAdminGroups(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockGroups)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/hooks/useAdminGroups.test.js
```

Expected: FAIL with file not found or export not defined

- [ ] **Step 3: Write minimal implementation**

Create `src/hooks/useAdminGroups.js`:

```javascript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAdminGroups() {
  return useQuery({
    queryKey: ['admin_groups'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_groups')
      if (error) throw error
      return data ?? []
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/hooks/useAdminGroups.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAdminGroups.js src/hooks/useAdminGroups.test.js
git commit -m "feat: add useAdminGroups hook with test"
```

---

## Task 6: Create useMyGroup Hook

**Files:**
- Create: `src/hooks/useMyGroup.js`
- Create: `src/hooks/useMyGroup.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useMyGroup.test.js`:

```javascript
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/queryWrapper'

const { resultRef, chain } = vi.hoisted(() => {
  const resultRef = { current: { data: null, error: null } }
  const target = {}
  const proxied = new Proxy(target, {
    get(t, prop) {
      if (prop === 'then') return (resolve) => resolve(resultRef.current)
      if (!t[prop]) t[prop] = vi.fn().mockReturnValue(proxied)
      return t[prop]
    },
  })
  return { resultRef, chain: proxied }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: () => chain },
}))

import { useMyGroup } from './useMyGroup'

describe('useMyGroup', () => {
  afterEach(() => {
    resultRef.current = { data: null, error: null }
  })

  it('returns group data from get_my_group RPC', async () => {
    const mockGroup = {
      id: 'g1',
      nama: 'Grup A',
      members: [
        { id: 'm1', klien_nama: 'Client 1', klien_email: 'client1@test.com' },
        { id: 'm2', klien_nama: 'Client 2', klien_email: 'client2@test.com' },
      ],
    }
    resultRef.current = { data: mockGroup, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMyGroup(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockGroup)
  })

  it('returns null when no group assigned', async () => {
    resultRef.current = { data: null, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMyGroup(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/hooks/useMyGroup.test.js
```

Expected: FAIL with file not found or export not defined

- [ ] **Step 3: Write minimal implementation**

Create `src/hooks/useMyGroup.js`:

```javascript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useMyGroup() {
  return useQuery({
    queryKey: ['my_group'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_group')
      if (error) throw error
      return data
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/hooks/useMyGroup.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMyGroup.js src/hooks/useMyGroup.test.js
git commit -m "feat: add useMyGroup hook with test"
```

---

## Task 7: Create Admin Groups Page

**Files:**
- Create: `src/pages/admin/AdminGroups.jsx`

- [ ] **Step 1: Write the AdminGroups component**

```javascript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, Loader2, Plus, Trash2, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAdminGroups } from '@/hooks/useAdminGroups'
import { groupCreateSchema } from '@/lib/validators'
import { supabase } from '@/lib/supabase'

function useAvailableAhliGizi() {
  return useQuery({
    queryKey: ['ahli_gizi_available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, email')
        .eq('role', 'ahli_gizi')
        .is('groups', null)
      if (error) throw error
      return data ?? []
    },
  })
}

function useAvailableKlien() {
  return useQuery({
    queryKey: ['klien_available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, email')
        .eq('role', 'klien')
        .is('group_members', null)
      if (error) throw error
      return data ?? []
    },
  })
}

export function AdminGroups() {
  const qc = useQueryClient()
  const { data: groups = [], isLoading } = useAdminGroups()
  const { data: availableAhliGizi = [] } = useAvailableAhliGizi()
  const { data: availableKlien = [] } = useAvailableKlien()

  const [search, setSearch] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [form, setForm] = useState({ nama: '', ahli_gizi_id: '' })
  const [selectedMembers, setSelectedMembers] = useState([])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(
      (g) =>
        g.nama.toLowerCase().includes(q) ||
        (g.ahli_gizi_nama || '').toLowerCase().includes(q)
    )
  }, [groups, search])

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = groupCreateSchema.safeParse(form)
      if (!result.success) {
        throw new Error(result.error.issues[0].message)
      }
      const { data, error } = await supabase
        .from('groups')
        .insert({ nama: form.nama.trim(), ahli_gizi_id: form.ahli_gizi_id })
        .select()
        .single()
      if (error) throw error

      // Add members if any selected
      if (selectedMembers.length > 0) {
        const members = selectedMembers.map((klien_id) => ({
          group_id: data.id,
          klien_id,
        }))
        const { error: memberError } = await supabase
          .from('group_members')
          .insert(members)
        if (memberError) throw memberError
      }

      return data
    },
    onSuccess: () => {
      toast.success('Grup dibuat.')
      setOpenCreate(false)
      qc.invalidateQueries({ queryKey: ['admin_groups'] })
      setForm({ nama: '', ahli_gizi_id: '' })
      setSelectedMembers([])
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal membuat grup.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (groupId) => {
      const { error } = await supabase.from('groups').delete().eq('id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Grup dihapus.')
      setConfirmDeleteId('')
      qc.invalidateQueries({ queryKey: ['admin_groups'] })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menghapus grup.')
    },
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm ring-1 ring-black/4">
          <CardContent className="p-0">
            <div className="p-4 md:p-5">
              <div>
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Kelola Grup</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-1.5">
                  Satu ahli gizi per grup, satu grup per klien.
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={() => setOpenCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah grup
                </Button>
              </div>
            </div>

            <div className="border-t border-border/60 bg-background">
              <div className="flex items-center px-4 py-3 md:px-5">
                <Input
                  type="search"
                  placeholder="Cari nama grup atau ahli gizi…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-md"
                  autoComplete="off"
                />
                <p className="ml-4 text-sm text-muted-foreground">
                  {filtered.length} grup
                </p>
              </div>

              {isLoading ? (
                <div className="border-t border-border/60 py-12">
                  <LoadingSpinner />
                </div>
              ) : filtered.length === 0 ? (
                <div className="border-t border-border/60 px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
                  {groups.length === 0 ? 'Belum ada grup.' : 'Tidak ada yang cocok dengan pencarian.'}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border border-t border-border/60 md:hidden">
                    {filtered.map((g) => (
                      <div
                        key={g.id}
                        className="flex min-h-10 items-center gap-2 bg-card px-3 py-2 text-left text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-foreground">{g.nama}</span>
                            <Badge variant="secondary" className="flex items-center gap-1 px-1.5 py-0 text-[10px]">
                              <Users className="h-2.5 w-2.5" />
                              {g.member_count ?? 0}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {g.ahli_gizi_nama || 'Ahli gizi belum ditetapkan'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setSelectedGroupId(g.id)
                            setConfirmDeleteId(g.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="hidden border-t border-border/60 md:block">
                    <Table className="text-xs">
                      <TableHeader className="sticky top-0 z-1 bg-table-header shadow-[0_1px_0_0_var(--color-table-line)]">
                        <TableRow className="border-table-line hover:bg-transparent">
                          <TableHead className="h-8 py-1.5 pl-3 pr-1 font-semibold text-table-header-foreground">
                            Nama grup
                          </TableHead>
                          <TableHead className="h-8 py-1.5 px-1 font-semibold text-table-header-foreground">
                            Ahli gizi
                          </TableHead>
                          <TableHead className="h-8 py-1.5 px-1 font-semibold text-table-header-foreground">
                            Jumlah klien
                          </TableHead>
                          <TableHead className="h-8 w-40 py-1.5 px-1 font-semibold text-table-header-foreground text-right">
                            Aksi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((g) => (
                          <TableRow
                            key={g.id}
                            className="border-table-line hover:bg-table-row-hover"
                          >
                            <TableCell className="py-1.5 pl-3 pr-1 font-medium">
                              {g.nama}
                            </TableCell>
                            <TableCell className="py-1.5 px-1">
                              {g.ahli_gizi_nama || '—'}
                            </TableCell>
                            <TableCell className="py-1.5 px-1">
                              <Badge variant="secondary" className="font-normal">
                                {g.member_count ?? 0} klien
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1 px-1 pr-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setConfirmDeleteId(g.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah grup</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Nama grup</Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="Contoh: Grup A"
              />
            </div>
            <div className="space-y-1">
              <Label>Ahli gizi</Label>
              <Select
                value={form.ahli_gizi_id}
                onValueChange={(v) => setForm((f) => ({ ...f, ahli_gizi_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih ahli gizi" />
                </SelectTrigger>
                <SelectContent>
                  {availableAhliGizi.map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.nama} ({ag.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Klien (opsional)</Label>
              <p className="text-xs text-muted-foreground">
                Klien dapat ditambahkan nanti. Pilih klien untuk ditambahkan sekarang.
              </p>
              <div className="max-h-40 overflow-auto rounded-md border border-border/60 p-2">
                {availableKlien.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada klien tersedia.</p>
                ) : (
                  availableKlien.map((k) => (
                    <label
                      key={k.id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(k.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, k.id])
                          } else {
                            setSelectedMembers(selectedMembers.filter((id) => id !== k.id))
                          }
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span>{k.nama}</span>
                      <span className="text-muted-foreground">({k.email})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Batal
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(o) => {
          if (!o && !deleteMutation.isPending) setConfirmDeleteId('')
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus grup?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tindakan ini akan menghapus grup dan semua klien di dalamnya. Ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId('')}
              disabled={deleteMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !confirmDeleteId}
              onClick={() => deleteMutation.mutate(confirmDeleteId)}
            >
              {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/AdminGroups.jsx
git commit -m "feat: add admin groups page with create and delete"
```

---

## Task 8: Create Nutritionist My Group Page

**Files:**
- Create: `src/pages/ahli-gizi/GiziMyGroup.jsx`

- [ ] **Step 1: Write the GiziMyGroup component**

```javascript
import { Link } from 'react-router-dom'
import { Users, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useMyGroup } from '@/hooks/useMyGroup'

export function GiziMyGroup() {
  const { data: group, isLoading, error } = useMyGroup()

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">Terjadi kesalahan</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {error.message ?? 'Gagal memuat data grup.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (!group) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-foreground">Belum ada grup</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Anda belum ditugaskan ke grup mana pun. Silakan hubungi admin untuk penugasan.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  const members = group.members ?? []

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{group.nama}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grup klien yang Anda tangani
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {members.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Belum ada klien di grup ini.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {members.map((member) => (
                  <Link
                    key={member.id}
                    to={`/gizi/clients/${member.klien_id}`}
                    className="block hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{member.klien_nama}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.klien_email}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        Klien
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ahli-gizi/GiziMyGroup.jsx
git commit -m "feat: add nutritionist my-group page"
```

---

## Task 9: Run Lint and Tests

- [ ] **Step 1: Run ESLint**

```bash
npm run lint
```

Expected: No errors (warnings are okay if pre-existing)

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 3: Fix any issues**

If lint or tests fail, fix the issues and commit the fixes.

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: address lint and test issues"
```

---

## Task 10: Manual Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Log in as admin and test:**
  1. Navigate to `/admin/groups`
  2. Create a new group with a nutritionist
  3. Verify group appears in list
  4. Delete the group
  5. Verify deletion

- [ ] **Step 3: Log in as nutritionist (ahli_gizi) and test:**
  1. Navigate to `/gizi/my-group`
  2. Verify "Belum ada grup" empty state appears
  3. As admin, assign nutritionist to a group with clients
  4. As nutritionist, refresh and verify group and clients appear
  5. Click a client link and verify navigation to client detail

- [ ] **Step 4: Log in as client (klien) and test:**
  1. Try accessing `/admin/groups` — should redirect to klien dashboard
  2. Try accessing `/gizi/my-group` — should redirect to klien dashboard

---

## Self-Review Checklist

After completing all tasks, verify:

1. **Spec coverage:** All requirements from the spec are implemented
   - Database tables with constraints ✓
   - RLS policies for all roles ✓
   - RPC functions for data access ✓
   - Admin UI at `/admin/groups` ✓
   - Nutritionist UI at `/gizi/my-group` ✓
   - Navigation updated ✓

2. **No placeholders:** All code is complete, no TBD/TODO

3. **Type consistency:** Function names, query keys, and schema match across all files

4. **Tests:** Hooks have unit tests, integration tested manually

5. **Security:** RLS policies enforce proper access control
