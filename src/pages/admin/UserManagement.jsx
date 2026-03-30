import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
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
import { ADMIN_TABLE_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function randomPassword() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

export function UserManagement() {
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

  const [openAdd, setOpenAdd] = useState(false)
  const [openPw, setOpenPw] = useState('')
  const [form, setForm] = useState({
    nama: '',
    email: '',
    nomor_wa: '',
    instalasi: '',
    role: 'klien',
    password: '',
  })

  const [editRow, setEditRow] = useState(null)

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
            instalasi: form.instalasi.trim(),
            role: form.role,
          },
        },
      })
      if (error) throw error
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
        instalasi: '',
        role: 'klien',
        password: '',
      })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal membuat pengguna.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          nama: editRow.nama,
          nomor_wa: editRow.nomor_wa || null,
          instalasi: editRow.instalasi || null,
          role: editRow.role,
        })
        .eq('id', editRow.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Perubahan disimpan.')
      setEditRow(null)
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal menyimpan.'),
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase.from('profiles').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
      toast.success('Status diperbarui.')
    },
    onError: (e) => toast.error(e.message ?? 'Gagal.'),
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5 md:space-y-6">
        <div className="max-md:px-0.5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">User</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-1.5">
            Kelola akun, peran, dan status aktif. Gunakan impor Excel untuk menambah banyak klien sekaligus.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
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

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Card className={cn('overflow-hidden', ADMIN_TABLE_CARD_SHELL)}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Instalasi</TableHead>
                <TableHead>WA</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.nama}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.instalasi ?? '—'}</TableCell>
                  <TableCell>{u.nomor_wa ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role}</Badge>
                  </TableCell>
                  <TableCell>{formatDateId(u.created_at?.slice(0, 10))}</TableCell>
                  <TableCell>
                    {u.is_active === false ? (
                      <Badge variant="destructive">Nonaktif</Badge>
                    ) : (
                      <Badge>Aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => setEditRow({ ...u })}>
                      Ubah
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleActive.mutate({ id: u.id, is_active: u.is_active === false })
                      }
                    >
                      {u.is_active === false ? 'Aktifkan' : 'Nonaktifkan'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </div>
          </CardContent>
        </Card>
      )}
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

      <Dialog open={Boolean(editRow)} onOpenChange={() => setEditRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah pengguna</DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <Label>Nama</Label>
                <Input
                  value={editRow.nama}
                  onChange={(e) => setEditRow((r) => ({ ...r, nama: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>WA</Label>
                <Input
                  value={editRow.nomor_wa ?? ''}
                  onChange={(e) => setEditRow((r) => ({ ...r, nomor_wa: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Instalasi</Label>
                <Input
                  value={editRow.instalasi ?? ''}
                  onChange={(e) => setEditRow((r) => ({ ...r, instalasi: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Peran</Label>
                <Select
                  value={editRow.role}
                  onValueChange={(v) => setEditRow((r) => ({ ...r, role: v }))}
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Batal
            </Button>
            <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
