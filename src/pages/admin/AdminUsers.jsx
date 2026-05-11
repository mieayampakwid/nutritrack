import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Search, UserCheck } from 'lucide-react'
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
import { useAuth } from '@/hooks/useAuth'
import { ADMIN_TABLE_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const ROLE_LABELS = {
  admin: 'Admin',
  ahli_gizi: 'Ahli Gizi',
  klien: 'Klien',
}

function roleBadgeVariant(role) {
  if (role === 'admin') return 'default'
  if (role === 'ahli_gizi') return 'secondary'
  return 'outline'
}

const INITIAL_CREATE_FORM = { nama: '', email: '', password: '', role: 'klien' }

export function AdminUsers() {
  const qc = useQueryClient()
  const { profile: currentUser } = useAuth()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, email, role, is_active, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [openCreate, setOpenCreate] = useState(false)
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM)

  const pendingCount = useMemo(
    () => users.filter((u) => !u.is_active).length,
    [users],
  )

  const filtered = useMemo(() => {
    let result = users
    if (roleFilter === 'pending') {
      result = result.filter((u) => !u.is_active)
    } else if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (u) =>
          (u.nama || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q),
      )
    }
    return result
  }, [users, search, roleFilter])

  const toggleMutation = useMutation({
    mutationFn: async ({ id, currentActive }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      toast.success(vars.currentActive ? 'Pengguna dinonaktifkan.' : 'Pengguna dikonfirmasi.')
      qc.invalidateQueries({ queryKey: ['admin_users'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal memperbarui status.'),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          nama: createForm.nama.trim(),
          email: createForm.email.trim().toLowerCase(),
          password: createForm.password,
          role: createForm.role,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success('Pengguna berhasil dibuat.')
      setOpenCreate(false)
      setCreateForm(INITIAL_CREATE_FORM)
      qc.invalidateQueries({ queryKey: ['admin_users'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal membuat pengguna.'),
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-white">Kelola Pengguna</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-1.5 md:text-white/85">
              Daftar seluruh pengguna platform. Buat, cari, filter, dan konfirmasi pengguna baru.
            </p>
          </div>
          <Button className="w-full shrink-0 sm:w-auto" onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pengguna
          </Button>
        </div>

        <Card className={cn('overflow-hidden', ADMIN_TABLE_CARD_SHELL)}>
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center md:px-5">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari nama atau email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Semua peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua peran</SelectItem>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      Menunggu Konfirmasi
                      {pendingCount > 0 && (
                        <Badge variant="destructive" className="text-[10px]">{pendingCount}</Badge>
                      )}
                    </span>
                  </SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="ahli_gizi">Ahli Gizi</SelectItem>
                  <SelectItem value="klien">Klien</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {filtered.length} pengguna
              </p>
            </div>

            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner />
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
                {users.length === 0 ? 'Belum ada pengguna.' : 'Tidak ada yang cocok dengan pencarian.'}
              </div>
            ) : (
              <>
                <div className="divide-y divide-border md:hidden">
                  {filtered.map((u) => (
                    <div
                      key={u.id}
                      className="flex min-h-10 items-center gap-2 bg-card px-3 py-2 text-left text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-foreground">{u.nama}</span>
                          <Badge variant={roleBadgeVariant(u.role)} className="text-[10px]">
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                          {!u.is_active && (
                            <Badge variant="destructive" className="text-[10px]">Pending</Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {!u.is_active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={toggleMutation.isPending}
                            onClick={() =>
                              toggleMutation.mutate({ id: u.id, currentActive: u.is_active })
                            }
                          >
                            <UserCheck className="mr-1 h-3.5 w-3.5" />
                            Konfirmasi
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={
                              toggleMutation.isPending ||
                              u.id === currentUser?.id
                            }
                            onClick={() =>
                              toggleMutation.mutate({ id: u.id, currentActive: u.is_active })
                            }
                          >
                            Nonaktifkan
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Peran</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-36 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.nama}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={roleBadgeVariant(u.role)}>
                                {ROLE_LABELS[u.role] || u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? 'default' : 'destructive'}>
                                {u.is_active ? 'Aktif' : 'Menunggu'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {!u.is_active ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={toggleMutation.isPending}
                                  onClick={() =>
                                    toggleMutation.mutate({ id: u.id, currentActive: u.is_active })
                                  }
                                >
                                  <UserCheck className="mr-1 h-3.5 w-3.5" />
                                  Konfirmasi
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={
                                    toggleMutation.isPending ||
                                    u.id === currentUser?.id
                                  }
                                  onClick={() =>
                                    toggleMutation.mutate({ id: u.id, currentActive: u.is_active })
                                  }
                                >
                                  Nonaktifkan
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Nama</Label>
              <Input
                value={createForm.nama}
                onChange={(e) => setCreateForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@contoh.com"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label>Kata Sandi</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label>Peran</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="klien">Klien</SelectItem>
                  <SelectItem value="ahli_gizi">Ahli Gizi</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenCreate(false)
                setCreateForm(INITIAL_CREATE_FORM)
              }}
            >
              Batal
            </Button>
            <Button
              disabled={
                createMutation.isPending ||
                !createForm.nama.trim() ||
                !createForm.email.trim() ||
                createForm.password.length < 6
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
