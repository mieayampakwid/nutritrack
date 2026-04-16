import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
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

function randomPassword() {
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        (u.nama || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.instalasi || '').toLowerCase().includes(q) ||
        (u.nomor_wa || '').toLowerCase().includes(q) ||
        (u.phone_whatsapp || '').toLowerCase().includes(q),
    )
  }, [users, search])

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
  const [form, setForm] = useState({
    nama: '',
    email: '',
    nomor_wa: '',
    phone_whatsapp: '',
    tgl_lahir: '',
    instalasi: '',
    role: 'klien',
    password: '',
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const pw = form.password || randomPassword()
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: pw,
        options: {
          data: {
            nama: form.nama.trim(),
            nomor_wa: form.nomor_wa.trim(),
            phone_whatsapp: form.phone_whatsapp.trim(),
            tgl_lahir: form.tgl_lahir.trim(),
            instalasi: form.instalasi.trim(),
            role: form.role,
          },
        },
      })
      if (error) throw error
      const uid = data.user?.id
      if (uid) {
        const tgl = form.tgl_lahir.trim()
        const ph = form.phone_whatsapp.trim()
        const { error: upErr } = await supabase
          .from('profiles')
          .update({
            tgl_lahir: tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : null,
            phone_whatsapp: ph || null,
          })
          .eq('id', uid)
        if (upErr) throw upErr
      }
      return { user: data.user, password: pw }
    },
    onSuccess: ({ password }) => {
      toast.success('Pengguna dibuat.')
      setOpenPw(password)
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
      setForm({
        nama: '',
        email: '',
        nomor_wa: '',
        phone_whatsapp: '',
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

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm ring-1 ring-black/[0.04]">
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
                <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {filtered.length} cocok
                  {search ? ` · ${users.length} total` : ''}
                </p>
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
                      <Link
                        key={u.id}
                        to={`/admin/users/${u.id}`}
                        className="flex min-h-10 items-center gap-2 bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 active:bg-muted/70"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="truncate font-medium text-foreground">{u.nama}</span>
                            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                              {roleLabel(u.role)}
                            </Badge>
                            {u.is_active === false ? (
                              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                                Nonaktif
                              </Badge>
                            ) : (
                              <Badge className="shrink-0 bg-primary/12 px-1.5 py-0 text-[10px] text-primary">
                                Aktif
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground" title={u.email}>
                            {u.email}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    ))}
                  </div>

                  <div className="hidden border-t border-border/60 md:block">
                    <div className="max-h-[min(70vh,720px)] overflow-auto bg-card">
                      <Table className="text-xs">
                        <TableHeader className="sticky top-0 z-[1] bg-table-header shadow-[0_1px_0_0_var(--color-table-line)]">
                          <TableRow className="border-table-line hover:bg-transparent">
                            <TableHead className="h-8 w-[28%] min-w-[8rem] py-1.5 pl-3 pr-1 font-semibold text-table-header-foreground">
                              Nama
                            </TableHead>
                            <TableHead className="h-8 min-w-[10rem] py-1.5 px-1 font-semibold text-table-header-foreground">
                              Email
                            </TableHead>
                            <TableHead className="h-8 w-[7rem] py-1.5 px-1 font-semibold text-table-header-foreground">
                              Peran
                            </TableHead>
                            <TableHead className="h-8 w-[5.5rem] py-1.5 px-1 font-semibold text-table-header-foreground">
                              Status
                            </TableHead>
                            <TableHead className="h-8 w-[6.5rem] py-1.5 px-1 font-semibold text-table-header-foreground">
                              Terdaftar
                            </TableHead>
                            <TableHead className="h-8 w-8 p-1 pr-2" aria-hidden />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageSlice.map((u) => (
                            <TableRow
                              key={u.id}
                              role="link"
                              tabIndex={0}
                              className="cursor-pointer border-table-line hover:bg-table-row-hover"
                              onClick={() => navigate(`/admin/users/${u.id}`)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  navigate(`/admin/users/${u.id}`)
                                }
                              }}
                            >
                              <TableCell className="py-1.5 pl-3 pr-1 font-medium">
                                <span className="line-clamp-2">{u.nama}</span>
                              </TableCell>
                              <TableCell className="max-w-0 py-1.5 px-1">
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
                                    Off
                                  </Badge>
                                ) : (
                                  <Badge className="text-[10px]">Aktif</Badge>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap py-1.5 px-1 text-muted-foreground">
                                {formatDateId(u.created_at?.slice(0, 10))}
                              </TableCell>
                              <TableCell className="py-1 pr-2 pl-0">
                                <ChevronRight
                                  className="mx-auto h-3.5 w-3.5 text-muted-foreground"
                                  aria-hidden
                                />
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
              <Label>Nomor WhatsApp</Label>
              <Input
                value={form.nomor_wa}
                onChange={(e) => setForm((f) => ({ ...f, nomor_wa: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Nomor WhatsApp (resume / wa.me)</Label>
              <Input
                value={form.phone_whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, phone_whatsapp: e.target.value }))}
                placeholder="Opsional; untuk tombol Kirim resume"
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
    </AppShell>
  )
}
