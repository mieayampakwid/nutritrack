import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInYears } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
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
import { useAuth } from '@/hooks/useAuth'
import {
  CALORIE_ACTIVITY_OPTIONS,
  CALORIE_STRESS_OPTIONS,
  activityLabelForValue,
  stressLabelForValue,
} from '@/lib/calorieFactors'
import { formatDateId, formatNumberId, formatDisplayName, parseIsoDateLocal, toIsoDateLocal } from '@/lib/format'
import { harrisBenedictBmr } from '@/lib/harrisBenedict'
import { supabase } from '@/lib/supabase'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

const HISTORY_PAGE_SIZE = 10

function sexLabel(v) {
  if (v === 'male') return 'Laki-laki'
  if (v === 'female') return 'Perempuan'
  return '—'
}

function rowDisplayDate(row) {
  if (row.tanggal) return formatDateId(row.tanggal)
  if (row.created_at) {
    const d = new Date(row.created_at)
    return formatDateId(toIsoDateLocal(d))
  }
  return '—'
}

function CalorieHistoryTable({ rows, page, onPageChange, loading, error, onRetry }) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    [rows],
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / HISTORY_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const slice = sorted.slice((safePage - 1) * HISTORY_PAGE_SIZE, safePage * HISTORY_PAGE_SIZE)

  if (loading) return <LoadingSpinner />
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center text-sm">
        <p className="text-destructive">Gagal memuat riwayat.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Coba lagi
        </Button>
      </div>
    )
  }
  if (sorted.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Belum ada riwayat perhitungan kebutuhan energi.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>JK</TableHead>
              <TableHead className="text-right">Umur</TableHead>
              <TableHead className="text-right">BB</TableHead>
              <TableHead className="text-right">TB</TableHead>
              <TableHead>Aktivitas</TableHead>
              <TableHead>Stres</TableHead>
              <TableHead className="text-right">BMR</TableHead>
              <TableHead className="text-right">Total (kkal)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{rowDisplayDate(r)}</TableCell>
                <TableCell className="text-xs">{sexLabel(r.jenis_kelamin)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.umur_tahun != null ? `${r.umur_tahun} th` : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumberId(r.berat_badan)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumberId(r.tinggi_badan)}</TableCell>
                <TableCell className="max-w-[140px] text-xs">{activityLabelForValue(r.faktor_aktivitas)}</TableCell>
                <TableCell className="max-w-[140px] text-xs">{stressLabelForValue(r.faktor_stres)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumberId(r.bmr)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatNumberId(r.energi_total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
          <p className="text-xs text-muted-foreground">
            Halaman {safePage} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CalorieClientForm({ clientId, listBase, clientsListPath, embedded = false }) {
  const qc = useQueryClient()
  const { profile: staff } = useAuth()
  const [activity, setActivity] = useState(null)
  const [stress, setStress] = useState(null)
  const [historyPage, setHistoryPage] = useState(1)

  const {
    data: client,
    isLoading: loadingClient,
    isError: clientError,
    refetch: refetchClient,
  } = useQuery({
    queryKey: ['profile', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', clientId).single()
      if (error) throw error
      return data
    },
  })

  const { data: measurements = [] } = useQuery({
    queryKey: ['measurements', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', clientId)
        .order('tanggal', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })

  const {
    data: assessments = [],
    isLoading: loadingA,
    isError: aError,
    refetch: refetchA,
  } = useQuery({
    queryKey: ['assessments', clientId, 'history'],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', clientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const latest = useMemo(() => {
    if (!measurements.length) return null
    return [...measurements].sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0]
  }, [measurements])

  const ageYears = useMemo(() => {
    if (!client?.tgl_lahir) return null
    const birth = parseIsoDateLocal(String(client.tgl_lahir).slice(0, 10))
    if (!birth) return null
    return differenceInYears(new Date(), birth)
  }, [client])

  const sex = client?.jenis_kelamin === 'male' || client?.jenis_kelamin === 'female' ? client.jenis_kelamin : null
  const hasAnthro =
    latest != null &&
    Number(latest.berat_badan) > 0 &&
    Number(latest.tinggi_badan) > 0
  const bb = hasAnthro ? Number(latest.berat_badan) : NaN
  const tb = hasAnthro ? Number(latest.tinggi_badan) : NaN

  const bmr = useMemo(() => {
    if (sex == null || ageYears == null || !hasAnthro) return null
    return harrisBenedictBmr({ sex, bbKg: bb, tbCm: tb, ageYears })
  }, [sex, ageYears, hasAnthro, bb, tb])

  const actNum = activity != null ? Number(activity) : NaN
  const strNum = stress != null ? Number(stress) : NaN
  const totalEnergy =
    bmr != null && Number.isFinite(actNum) && Number.isFinite(strNum)
      ? Math.round(bmr * actNum * strNum * 10) / 10
      : null

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!staff?.id) throw new Error('Sesi tidak valid.')
      if (totalEnergy == null) throw new Error('Lengkapi faktor aktivitas dan stres.')
      const tanggal = toIsoDateLocal(new Date())
      const { error } = await supabase.from('assessments').insert({
        user_id: clientId,
        faktor_aktivitas: actNum,
        faktor_stres: strNum,
        energi_total: totalEnergy,
        created_by: staff.id,
        tanggal,
        jenis_kelamin: sex,
        umur_tahun: ageYears,
        berat_badan: bb,
        tinggi_badan: tb,
        bmr,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Kebutuhan energi disimpan.')
      qc.invalidateQueries({ queryKey: ['assessments', clientId] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
      qc.invalidateQueries({ queryKey: ['staff_clients_unified'] })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menyimpan.')
    },
  })

  const canSave =
    activity != null &&
    stress != null &&
    bmr != null &&
    totalEnergy != null &&
    !saveMutation.isPending &&
    !loadingClient &&
    !clientError

  if (loadingClient || !clientId) {
    if (embedded) {
      return (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      )
    }
    return (
      <AppShell>
        <LoadingSpinner />
      </AppShell>
    )
  }

  if (clientError || !client) {
    if (embedded) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">Klien tidak ditemukan.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetchClient()}>
            Coba lagi
          </Button>
        </div>
      )
    }
    return (
      <AppShell>
        <p className="text-muted-foreground">Klien tidak ditemukan.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetchClient()}>
          Coba lagi
        </Button>
        <Button asChild variant="link" className="mt-2 block px-0">
          <Link to={clientsListPath}>Kembali ke daftar</Link>
        </Button>
      </AppShell>
    )
  }

  if (client.role !== 'klien') {
    if (embedded) {
      return <p className="text-sm text-muted-foreground">Pengguna ini bukan klien.</p>
    }
    return (
      <AppShell>
        <p className="text-muted-foreground">Pengguna ini bukan klien.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to={clientsListPath}>Kembali</Link>
        </Button>
      </AppShell>
    )
  }

  const body = (
    <div className={cn('space-y-6', embedded ? '' : 'mx-auto max-w-3xl')}>
      {!embedded ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link to={clientsListPath}>
                <ArrowLeft className="h-4 w-4" />
                Kembali ke daftar
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`${clientsListPath}?client=${clientId}`}>Detail klien</Link>
            </Button>
          </div>

          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Kebutuhan energi — {formatDisplayName(client.nama)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Harris–Benedict dengan faktor aktivitas dan stres. BB/TB dari antropometri terakhir.
            </p>
          </div>
        </>
      ) : (
        <div>
          <h2 className="text-base font-semibold tracking-tight">Kebutuhan energi</h2>
          <p className="mt-1 text-sm text-muted-foreground">Harris–Benedict; BB/TB dari antropometri terakhir.</p>
        </div>
      )}

        {!hasAnthro ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          >
            {embedded
              ? 'Belum ada data antropometri. Tambahkan pengukuran di tab Antropometri.'
              : 'Belum ada data antropometri. Tambahkan pengukuran di detail klien sebelum menghitung BMR.'}
          </div>
        ) : null}

        {sex == null || ageYears == null ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          >
            {embedded
              ? 'Profil tidak lengkap: tanggal lahir dan jenis kelamin wajib. Lengkapi di tab Profil.'
              : 'Profil tidak lengkap: tanggal lahir dan jenis kelamin wajib ada untuk menghitung BMR.'}
          </div>
        ) : null}

        <Card className={cn('md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
          <CardHeader>
            <CardTitle className="text-base">Perhitungan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Jenis kelamin</dt>
                <dd className="text-sm font-medium">{sex != null ? sexLabel(sex) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Umur</dt>
                <dd className="text-sm font-medium">{ageYears != null ? `${ageYears} tahun` : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Berat badan terakhir (kg)</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {hasAnthro ? formatNumberId(latest.berat_badan) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Tinggi badan terakhir (cm)</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {hasAnthro ? formatNumberId(latest.tinggi_badan) : '—'}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <Label>Faktor aktivitas</Label>
              <Select
                value={activity != null ? String(activity) : undefined}
                onValueChange={(v) => setActivity(Number(v))}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Pilih faktor aktivitas" />
                </SelectTrigger>
                <SelectContent>
                  {CALORIE_ACTIVITY_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={String(a.value)}>
                      {a.label} ({a.range})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activity == null ? (
                <p className="text-xs text-destructive">Pilih faktor aktivitas.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Faktor stres</Label>
              <Select
                value={stress != null ? String(stress) : undefined}
                onValueChange={(v) => setStress(Number(v))}
              >
                <SelectTrigger className="min-h-11 whitespace-normal text-left">
                  <SelectValue placeholder="Pilih faktor stres" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {CALORIE_STRESS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={String(s.value)} className="whitespace-normal py-2">
                      <span className="font-medium">{s.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Rentang {s.range}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stress == null ? <p className="text-xs text-destructive">Pilih faktor stres.</p> : null}
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-sm">
              <p>
                <span className="text-muted-foreground">BMR: </span>
                <span className="font-semibold tabular-nums">
                  {bmr != null ? `${formatNumberId(bmr)} kkal/hari` : '—'}
                </span>
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Total kebutuhan energi: </span>
                <span className="font-semibold tabular-nums text-primary">
                  {totalEnergy != null ? `${formatNumberId(totalEnergy)} kkal/hari` : '—'}
                </span>
              </p>
            </div>

            <Button type="button" disabled={!canSave} onClick={() => saveMutation.mutate()}>
              Simpan
            </Button>
          </CardContent>
        </Card>

        <Card className={cn('overflow-hidden', MOBILE_DASHBOARD_CARD_SHELL)}>
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Riwayat</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <CalorieHistoryTable
              rows={assessments}
              page={historyPage}
              onPageChange={setHistoryPage}
              loading={loadingA}
              error={aError}
              onRetry={() => refetchA()}
            />
          </CardContent>
        </Card>

        {!embedded ? (
          <p className="text-center text-xs text-muted-foreground">
            <Link className="underline-offset-4 hover:underline" to={`${listBase}/calorie-needs`}>
              Pilih klien lain
            </Link>
          </p>
        ) : null}
      </div>
  )

  if (embedded) return body

  return <AppShell>{body}</AppShell>
}

/** @deprecated Routes redirect to daftar klien; gunakan `CalorieClientForm` dengan `embedded`. */
export function CalorieNeedsStandalonePage() {
  const { clientId } = useParams()
  const location = useLocation()
  const base = location.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'
  const to = clientId ? `${base}?client=${encodeURIComponent(clientId)}&tab=bmi` : base
  return <Navigate to={to} replace />
}
