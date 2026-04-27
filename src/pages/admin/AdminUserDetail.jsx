import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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

const USERS_LIST_HREF = '/admin/clients?list=pengguna'

export function AdminUserDetail() {
  const { id: idFromRoute } = useParams()
  const [searchParams] = useSearchParams()
  const id = idFromRoute || searchParams.get('user')
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)

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

  const updateMutation = useMutation({
    mutationFn: async () => {
      const tgl = (editRow.tgl_lahir ?? '').trim()
      const ph = (editRow.phone_whatsapp ?? '').trim()
      const { error: e } = await supabase
        .from('profiles')
        .update({
          nama: editRow.nama,
          nomor_wa: editRow.nomor_wa || null,
          phone_whatsapp: ph || null,
          tgl_lahir: tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : null,
          instalasi: editRow.instalasi || null,
          role: editRow.role,
        })
        .eq('id', editRow.id)
      if (e) throw e
    },
    onSuccess: () => {
      toast.success('Perubahan disimpan.')
      setEditOpen(false)
      setEditRow(null)
      qc.invalidateQueries({ queryKey: ['profile_admin_detail', id] })
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
      qc.invalidateQueries({ queryKey: ['staff_clients_unified'] })
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
      qc.invalidateQueries({ queryKey: ['staff_clients_unified'] })
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
          <Link to={USERS_LIST_HREF}>Kembali ke daftar</Link>
        </Button>
      </AppShell>
    )
  }

  if (!profile) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Pengguna tidak ditemukan.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to={USERS_LIST_HREF}>Kembali ke daftar</Link>
        </Button>
      </AppShell>
    )
  }

  function openEdit() {
    setEditRow({ ...profile })
    setEditOpen(true)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1 px-2" asChild>
            <Link to={USERS_LIST_HREF}>
              <ArrowLeft className="h-4 w-4" />
              Daftar pengguna
            </Link>
          </Button>
        </div>

        <Card className={cn('border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04]', MOBILE_DASHBOARD_CARD_SHELL)}>
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
                <dt className="font-medium text-muted-foreground">WhatsApp</dt>
                <dd className="mt-0.5 text-foreground">{profile.nomor_wa ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">WhatsApp (resume)</dt>
                <dd className="mt-0.5 text-foreground">{profile.phone_whatsapp ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Tanggal lahir</dt>
                <dd className="mt-0.5 text-foreground">
                  {profile.tgl_lahir ? formatDateId(profile.tgl_lahir.slice(0, 10)) : '—'}
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
                  <Link to={`/admin/clients?client=${encodeURIComponent(profile.id)}`}>Lihat sebagai klien</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {profile.role === 'klien' ? (
          <div className="space-y-3">
            <ClientNutritionSummaryCard profile={profile} />
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link to={`/admin/clients?client=${encodeURIComponent(profile.id)}&tab=bmi`}>
                BMI &amp; kebutuhan energi (daftar klien)
              </Link>
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
                <Label>WA</Label>
                <Input
                  value={editRow.nomor_wa ?? ''}
                  onChange={(e) => setEditRow((r) => ({ ...r, nomor_wa: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>WA resume (wa.me)</Label>
                <Input
                  value={editRow.phone_whatsapp ?? ''}
                  onChange={(e) => setEditRow((r) => ({ ...r, phone_whatsapp: e.target.value }))}
                  placeholder="Opsional"
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
