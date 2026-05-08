import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, X, ChevronRight, Loader2 } from 'lucide-react'
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
import { formatDateId } from '@/lib/format'
import { roleLabel, USERS_PAGE_SIZE } from '@/lib/adminUsers'
import { supabase } from '@/lib/supabase'
import { userCreateSchema } from '@/lib/validators'

export function randomPassword() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

export function UserManagement() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['profiles_admin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_profiles')
      if (error) throw error
      return data ?? []
    },
  })

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    let result = users
    if (filter === 'pending') {
      result = users.filter((u) => u.is_active === false)
    } else if (filter === 'approved') {
      result = users.filter((u) => u.is_active === true)
    }
    const q = search.trim().toLowerCase()
    if (!q) return result
    return result.filter(
      (u) =>
        (u.nama || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.instalasi || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q),
    )
  }, [users, search, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / USERS_PAGE_SIZE))
  const effectivePage = Math.max(1, Math.min(page, pageCount))

  const pageSlice = useMemo(() => {
    const start = (effectivePage - 1) * USERS_PAGE_SIZE
    return filtered.slice(start, start + USERS_PAGE_SIZE)
  }, [filtered, effectivePage])

  const displayStart = filtered.length === 0 ? 0 : (effectivePage - 1) * USERS_PAGE_SIZE + 1
  const displayEnd =
    filtered.length === 0 ? 0 : (effectivePage - 1) * USERS_PAGE_SIZE + pageSlice.length

  const [openAdd, setOpenAdd] = useState(false)
  const [openPw, setOpenPw] = useState('')
  const [confirmRejectId, setConfirmRejectId] = useState('')
  const [form, setForm] = useState({
    nama: '',
    email: '',
    phone: '',
    tgl_lahir: '',
    instalasi: '',
    role: 'klien',
    password: '',
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = userCreateSchema.safeParse(form)
      if (!result.success) {
        throw new Error(result.error.issues[0].message)
      }
      const pw = form.password || randomPassword()

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: pw,
        options: {
          data: {
            nama: form.nama.trim(),
            tgl_lahir: form.tgl_lahir.trim(),
            instalasi: form.instalasi.trim(),
            role: form.role,
          },
        },
      })
      if (error) throw error
      const uid = data.user?.id
      if (uid) {
        const phone = form.phone.trim()
        if (phone) {
          const { data: fnData, error: fnErr } = await supabase.functions.invoke(
            'admin-update-user-phone',
            { body: { user_id: uid, phone } },
          )
          if (fnErr) throw fnErr
          if (fnData && typeof fnData === 'object' && fnData.error) {
            throw new Error(String(fnData.error))
          }
        }
        const { data: actData, error: actErr } = await supabase.rpc('admin_activate_user', {
          p_user_id: uid,
        })
        if (actErr) throw actErr
        if (actData && typeof actData === 'object' && actData.error) {
          throw new Error(String(actData.error))
        }
        const tgl = form.tgl_lahir.trim()
        const { error: upErr } = await supabase
          .from('profiles')
          .update({
            tgl_lahir: tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : null,
          })
          .eq('id', uid)
        if (upErr) throw upErr
      }
      return { password: pw }
    },
    onSuccess: ({ password }) => {
      toast.success('Pengguna dibuat.')
      setOpenPw(password)
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
      setForm({
        nama: '',
        email: '',
        phone: '',
        tgl_lahir: '',
        instalasi: '',
        role: 'klien',
        password: '',
      })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal membuat pengguna.')
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (userId) => {
      const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Pengguna disetujui.')
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menyetujui.')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (userId) => {
      // Refresh so access_token is valid; use that token explicitly. This matches the
      // pattern used by `src/lib/openai.js` to avoid transient "invalid jwt" errors.
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      const accessToken = refreshData?.session?.access_token
      if (refreshError || !accessToken) {
        throw new Error('Sesi tidak valid atau sudah habis. Silakan keluar lalu login kembali.')
      }

      const { error: userError } = await supabase.auth.getUser()
      if (userError) {
        throw new Error('Sesi tidak valid. Silakan keluar lalu login kembali.')
      }

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (error) throw error
      if (data && typeof data === 'object' && data.error) {
        throw new Error(String(data.error))
      }
    },
    onSuccess: () => {
      toast.success('Pengguna ditolak.')
      setConfirmRejectId('')
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menolak.')
    },
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm ring-1 ring-black/4">
          <CardContent className="p-0">
            <div className="p-4 md:p-5">
              <div>
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">User</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-1.5">
                  Daftar ringkas; ketuk atau klik baris untuk detail dan tindakan. Impor massal lewat
                  Excel.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link to="/admin/import">Impor Excel</Link>
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setForm((f) => ({ ...f, password: randomPassword() }))
                    setOpenAdd(true)
                  }}
                >
                  Tambah pengguna
                </Button>
              </div>
            </div>

            <div className="border-t border-border/60 bg-background">
              <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="search"
                    placeholder="Cari nama, email, instalasi, WA…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="h-9 w-full border-input bg-background text-foreground shadow-sm sm:max-w-md"
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFilter('all')
                      setPage(1)
                    }}
                    className="h-8"
                  >
                    Semua
                  </Button>
                  <Button
                    variant={filter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFilter('pending')
                      setPage(1)
                    }}
                    className="h-8"
                  >
                    Pending
                  </Button>
                  <Button
                    variant={filter === 'approved' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFilter('approved')
                      setPage(1)
                    }}
                    className="h-8"
                  >
                    Approved
                  </Button>
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {filtered.length} cocok
                    {search || filter !== 'all' ? ` · ${users.length} total` : ''}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="border-t border-border/60 py-12">
                  <LoadingSpinner />
                </div>
              ) : filtered.length === 0 ? (
                <div className="border-t border-border/60 px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
                  {users.length === 0 ? 'Belum ada pengguna.' : 'Tidak ada yang cocok dengan pencarian.'}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border border-t border-border/60 md:hidden">
                    {pageSlice.map((u) => (
                      <div
                        key={u.id}
                        className="flex min-h-10 items-center gap-2 bg-card px-3 py-2 text-left text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="truncate font-medium text-foreground">{u.nama}</span>
                            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                              {roleLabel(u.role)}
                            </Badge>
                            {u.is_active === false ? (
                              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                                Pending
                              </Badge>
                            ) : (
                              <Badge className="shrink-0 bg-primary/12 px-1.5 py-0 text-[10px] text-primary">
                                Approved
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground" title={u.email}>
                            {u.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {u.is_active === false && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700"
                                onClick={() => approveMutation.mutate(u.id)}
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setConfirmRejectId(u.id)}
                                disabled={rejectMutation.isPending}
                              >
                                {rejectMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            asChild
                          >
                            <Link to={`/admin/users/${u.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden border-t border-border/60 md:block">
                    <div className="max-h-[min(70vh,720px)] overflow-auto bg-card">
                      <Table className="text-xs">
                        <TableHeader className="sticky top-0 z-1 bg-table-header shadow-[0_1px_0_0_var(--color-table-line)]">
                          <TableRow className="border-table-line hover:bg-transparent">
                            <TableHead className="h-8 w-[26%] min-w-32 py-1.5 pl-3 pr-1 font-semibold text-table-header-foreground">
                              Nama
                            </TableHead>
                            <TableHead className="h-8 min-w-40 py-1.5 px-1 font-semibold text-table-header-foreground">
                              Email
                            </TableHead>
                            <TableHead className="h-8 w-26 py-1.5 px-1 font-semibold text-table-header-foreground">
                              Peran
                            </TableHead>
                            <TableHead className="h-8 w-24 py-1.5 px-1 font-semibold text-table-header-foreground">
                              Status
                            </TableHead>
                            <TableHead className="h-8 w-24 py-1.5 px-1 font-semibold text-table-header-foreground">
                              Terdaftar
                            </TableHead>
                            <TableHead className="h-8 w-40 py-1.5 px-1 font-semibold text-table-header-foreground text-right">
                              Aksi
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageSlice.map((u) => (
                            <TableRow
                              key={u.id}
                              className="border-table-line hover:bg-table-row-hover"
                            >
                              <TableCell
                                className="py-1.5 pl-3 pr-1 font-medium cursor-pointer hover:underline"
                                onClick={() => navigate(`/admin/users/${u.id}`)}
                              >
                                <span className="line-clamp-2">{u.nama}</span>
                              </TableCell>
                              <TableCell
                                className="max-w-0 py-1.5 px-1 cursor-pointer hover:underline"
                                onClick={() => navigate(`/admin/users/${u.id}`)}
                              >
                                <span className="block truncate text-muted-foreground" title={u.email}>
                                  {u.email}
                                </span>
                              </TableCell>
                              <TableCell className="py-1.5 px-1">
                                <Badge variant="secondary" className="font-normal">
                                  {roleLabel(u.role)}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5 px-1">
                                {u.is_active === false ? (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Pending
                                  </Badge>
                                ) : (
                                  <Badge className="text-[10px]">Approved</Badge>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap py-1.5 px-1 text-muted-foreground">
                                {formatDateId(u.created_at?.slice(0, 10))}
                              </TableCell>
                              <TableCell className="py-1 px-1 pr-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {u.is_active === false && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-green-600 hover:bg-green-50 hover:text-green-700"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          approveMutation.mutate(u.id)
                                        }}
                                        disabled={approveMutation.isPending}
                                      >
                                        {approveMutation.isPending ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Check className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setConfirmRejectId(u.id)
                                        }}
                                        disabled={rejectMutation.isPending}
                                      >
                                        {rejectMutation.isPending ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <X className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => navigate(`/admin/users/${u.id}`)}
                                  >
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-border/60 bg-background px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-5">
                    <span className="tabular-nums text-foreground">
                      Menampilkan {displayStart}–{displayEnd} dari {filtered.length} · {USERS_PAGE_SIZE}{' '}
                      per halaman
                    </span>
                    {pageCount > 1 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 bg-background"
                          disabled={effectivePage <= 1}
                          onClick={() =>
                            setPage((p) => {
                              const cur = Math.max(1, Math.min(p, pageCount))
                              return Math.max(1, cur - 1)
                            })
                          }
                        >
                          Sebelumnya
                        </Button>
                        <span className="tabular-nums text-foreground">
                          Hal {effectivePage} / {pageCount}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 bg-background"
                          disabled={effectivePage >= pageCount}
                          onClick={() =>
                            setPage((p) => {
                              const cur = Math.max(1, Math.min(p, pageCount))
                              return Math.min(pageCount, cur + 1)
                            })
                          }
                        >
                          Berikutnya
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah pengguna</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Nama lengkap</Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Nomor telepon / WhatsApp</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+6281234567890"
              />
            </div>
            <div className="space-y-1">
              <Label>Tanggal lahir</Label>
              <Input
                type="date"
                value={form.tgl_lahir}
                onChange={(e) => setForm((f) => ({ ...f, tgl_lahir: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Instalasi</Label>
              <Input
                value={form.instalasi}
                onChange={(e) => setForm((f) => ({ ...f, instalasi: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Peran</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="ahli_gizi">ahli_gizi</SelectItem>
                  <SelectItem value="klien">klien</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Kata sandi sementara (otomatis, bisa diubah)</Label>
              <Input
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>
              Batal
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(openPw)} onOpenChange={() => setOpenPw('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simpan kata sandi sementara</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Kata sandi ini hanya ditampilkan sekali. Salin dan bagikan dengan pengguna.
          </p>
          <Input readOnly value={openPw} className="font-mono" />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmRejectId)}
        onOpenChange={(o) => {
          if (!o && !rejectMutation.isPending) setConfirmRejectId('')
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus pengguna pending?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tindakan ini akan menghapus akun dan profil pengguna. Ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRejectId('')}
              disabled={rejectMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending || !confirmRejectId}
              onClick={() => rejectMutation.mutate(confirmRejectId)}
            >
              {rejectMutation.isPending ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
