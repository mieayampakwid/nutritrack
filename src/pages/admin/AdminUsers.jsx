import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Search, UserCheck } from 'lucide-react'
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

const GENDER_LABELS = {
  male: 'Laki-laki',
  female: 'Perempuan',
}

const INITIAL_CREATE_FORM = { nama: '', email: '', password: '', role: 'klien' }
const INITIAL_EDIT = null

function formatDateDisplay(d) {
  if (!d) return '—'
  const parts = String(d).split('-')
  if (parts.length !== 3) return d
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function isoToDateInput(d) {
  if (!d) return ''
  const s = String(d).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

export function AdminUsers() {
  const qc = useQueryClient()
  const { profile: currentUser } = useAuth()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, email, role, is_active, created_at, tgl_lahir, jenis_kelamin')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [openCreate, setOpenCreate] = useState(false)
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM)
  const [editUser, setEditUser] = useState(INITIAL_EDIT)

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, nama, tgl_lahir, jenis_kelamin, role }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          nama: nama.trim(),
          tgl_lahir: tgl_lahir || null,
          jenis_kelamin: jenis_kelamin || null,
          role,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Profil diperbarui.')
      setEditUser(null)
      qc.invalidateQueries({ queryKey: ['admin_users'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal memperbarui profil.'),
  })

  function openEdit(u) {
    setEditUser({
      id: u.id,
      nama: u.nama || '',
      email: u.email || '',
      tgl_lahir: isoToDateInput(u.tgl_lahir),
      jenis_kelamin: u.jenis_kelamin || '',
      role: u.role,
    })
  }

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
                        <p className="text-[10px] text-muted-foreground">
                          {GENDER_LABELS[u.jenis_kelamin] || '—'} · {formatDateDisplay(u.tgl_lahir)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(u)}
                          aria-label="Ubah pengguna"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                          <TableHead>JK / Tgl Lahir</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-44 text-right">Aksi</TableHead>
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
                            <TableCell className="text-xs text-muted-foreground">
                              {GENDER_LABELS[u.jenis_kelamin] || '—'} · {formatDateDisplay(u.tgl_lahir)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? 'default' : 'destructive'}>
                                {u.is_active ? 'Aktif' : 'Menunggu'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(u)}
                                aria-label="Ubah pengguna"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
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

      <Dialog open={Boolean(editUser)} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Profil</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <Label>Nama</Label>
                <Input
                  value={editUser.nama}
                  onChange={(e) => setEditUser((f) => ({ ...f, nama: e.target.value }))}
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={editUser.email} disabled className="opacity-60" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={editUser.tgl_lahir}
                    onChange={(e) => setEditUser((f) => ({ ...f, tgl_lahir: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Jenis Kelamin</Label>
                  <Select
                    value={editUser.jenis_kelamin}
                    onValueChange={(v) => setEditUser((f) => ({ ...f, jenis_kelamin: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Peran</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(v) => setEditUser((f) => ({ ...f, role: v }))}
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Batal
            </Button>
            <Button
              disabled={
                updateMutation.isPending ||
                !editUser?.nama.trim() ||
                !editUser?.role
              }
              onClick={() =>
                updateMutation.mutate({
                  id: editUser.id,
                  nama: editUser.nama,
                  tgl_lahir: editUser.tgl_lahir || null,
                  jenis_kelamin: editUser.jenis_kelamin || null,
                  role: editUser.role,
                })
              }
            >
              {updateMutation.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
