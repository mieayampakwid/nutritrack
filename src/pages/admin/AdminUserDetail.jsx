import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDateId } from '@/lib/format'
import { roleLabel } from '@/lib/adminUsers'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ClientNutritionSummaryCard } from '@/components/clients/ClientNutritionSummaryCard'

export function AdminUserDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [phone, setPhone] = useState('')

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['profile_admin_detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error: e } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (e) {
        if (e.code === 'PGRST116') return null
        throw e
      }
      return data
    },
  })

  const { isLoading: phoneLoading } = useQuery({
    queryKey: ['admin_user_phone', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_user_phone', { p_user_id: id })
      if (error) throw error
      setPhone(data ?? '')
      return data ?? ''
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const tgl = (editRow.tgl_lahir ?? '').trim()
      const { error: e } = await supabase
        .from('profiles')
        .update({
          nama: editRow.nama,
          tgl_lahir: tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : null,
          instalasi: editRow.instalasi || null,
          role: editRow.role,
          riwayat_penyakit: (editRow.riwayat_penyakit ?? '').trim() || null,
        })
        .eq('id', editRow.id)
      if (e) throw e

      const nextPhone = String(editRow.phone ?? '').trim()
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        'admin-update-user-phone',
        { body: { user_id: editRow.id, phone: nextPhone } },
      )
      if (fnErr) throw fnErr
      if (fnData && typeof fnData === 'object' && fnData.error) {
        throw new Error(String(fnData.error))
      }
    },
    onSuccess: () => {
      toast.success('Perubahan disimpan.')
      setEditOpen(false)
      setEditRow(null)
      setPhone(String(editRow?.phone ?? '').trim())
      qc.invalidateQueries({ queryKey: ['profile_admin_detail', id] })
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal menyimpan.'),
  })

  const toggleActive = useMutation({
    mutationFn: async ({ is_active }) => {
      const { error: e } = await supabase.from('profiles').update({ is_active }).eq('id', id)
      if (e) throw e
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile_admin_detail', id] })
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
      toast.success('Status diperbarui.')
    },
    onError: (e) => toast.error(e.message ?? 'Gagal.'),
  })

  if (isLoading || !id) {
    return (
      <AppShell>
        <LoadingSpinner />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <p className="text-destructive">Gagal memuat data pengguna.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to="/admin/users">Kembali ke daftar</Link>
        </Button>
      </AppShell>
    )
  }

  if (!profile) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Pengguna tidak ditemukan.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to="/admin/users">Kembali ke daftar</Link>
        </Button>
      </AppShell>
    )
  }

  function openEdit() {
    setEditRow({ ...profile, phone })
    setEditOpen(true)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1 px-2" asChild>
            <Link to="/admin/users">
              <ArrowLeft className="h-4 w-4" />
              Daftar user
            </Link>
          </Button>
        </div>

        <Card className={cn('border-border/80 bg-card shadow-sm ring-1 ring-black/4', MOBILE_DASHBOARD_CARD_SHELL)}>
          <CardHeader className="space-y-1 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="text-xl leading-snug">{profile.nama}</CardTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{roleLabel(profile.role)}</Badge>
                {profile.is_active === false ? (
                  <Badge variant="destructive">Nonaktif</Badge>
                ) : (
                  <Badge>Aktif</Badge>
                )}
              </div>
            </div>
            <p className="break-all text-sm text-muted-foreground">{profile.email}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Instalasi</dt>
                <dd className="mt-0.5 text-foreground">{profile.instalasi ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Telepon / WhatsApp</dt>
                <dd className="mt-0.5 text-foreground">
                  {phoneLoading ? 'Memuat…' : phone || '—'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Tanggal lahir</dt>
                <dd className="mt-0.5 text-foreground">
                  {profile.tgl_lahir ? formatDateId(profile.tgl_lahir.slice(0, 10)) : '—'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Riwayat penyakit</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-foreground">
                  {profile.riwayat_penyakit || '—'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Terdaftar</dt>
                <dd className="mt-0.5 text-foreground">
                  {formatDateId(profile.created_at?.slice(0, 10))}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">ID</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{profile.id}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap">
              <Button variant="outline" className="w-full sm:w-auto" onClick={openEdit}>
                Ubah data
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={toggleActive.isPending}
                onClick={() =>
                  toggleActive.mutate({ is_active: profile.is_active === false })
                }
              >
                {profile.is_active === false ? 'Aktifkan akun' : 'Nonaktifkan akun'}
              </Button>
              {profile.role === 'klien' ? (
                <Button variant="secondary" className="w-full sm:w-auto" asChild>
                  <Link to={`/admin/clients/${profile.id}`}>Lihat sebagai klien</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {profile.role === 'klien' ? (
          <div className="space-y-3">
            <ClientNutritionSummaryCard profile={profile} />
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link to={`/admin/clients/${profile.id}/data-entry`}>Entri / ubah data BMI &amp; asesmen</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          if (!o) {
            setEditOpen(false)
            setEditRow(null)
          }
        }}
      >
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
                <Label>Telepon / WhatsApp</Label>
                <Input
                  value={editRow.phone ?? ''}
                  onChange={(e) => setEditRow((r) => ({ ...r, phone: e.target.value }))}
                  placeholder="+6281234567890"
                />
              </div>
              <div className="space-y-1">
                <Label>Tanggal lahir</Label>
                <Input
                  type="date"
                  value={
                    editRow.tgl_lahir
                      ? String(editRow.tgl_lahir).slice(0, 10)
                      : ''
                  }
                  onChange={(e) => setEditRow((r) => ({ ...r, tgl_lahir: e.target.value }))}
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
                <Label>Riwayat penyakit</Label>
                <Textarea
                  value={editRow.riwayat_penyakit ?? ''}
                  onChange={(e) => setEditRow((r) => ({ ...r, riwayat_penyakit: e.target.value }))}
                  placeholder="Isi riwayat penyakit jika ada"
                  rows={3}
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
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false)
                setEditRow(null)
              }}
            >
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
