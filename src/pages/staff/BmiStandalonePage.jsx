import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInYears } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { calculateBMI, getBMICategory } from '@/lib/bmiCalculator'
import { formatDateId, formatNumberId, formatDisplayName, parseIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

const HISTORY_PAGE_SIZE = 10

function sexLabel(v) {
  if (v === 'male') return 'Laki-laki'
  if (v === 'female') return 'Perempuan'
  return '—'
}

function BmiHistoryTable({ measurements, page, onPageChange, loading, error, onRetry }) {
  const sorted = useMemo(
    () => [...measurements].sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [measurements],
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / HISTORY_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const slice = sorted.slice((safePage - 1) * HISTORY_PAGE_SIZE, safePage * HISTORY_PAGE_SIZE)

  if (loading) {
    return <LoadingSpinner />
  }
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
        Belum ada riwayat pengukuran untuk klien ini.
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
              <TableHead className="text-right">BB (kg)</TableHead>
              <TableHead className="text-right">TB (cm)</TableHead>
              <TableHead className="text-right">BMI</TableHead>
              <TableHead className="text-right">Kategori</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((m) => {
              const bmi = m.bmi != null ? Number(m.bmi) : calculateBMI(m.berat_badan, m.tinggi_badan)
              const cat = getBMICategory(bmi)
              return (
                <TableRow key={m.id}>
                  <TableCell>{formatDateId(m.tanggal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumberId(m.berat_badan)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumberId(m.tinggi_badan)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumberId(bmi)}</TableCell>
                  <TableCell className="text-right">{cat.label}</TableCell>
                </TableRow>
              )
            })}
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

export function BmiClientForm({ clientId, listBase, clientsListPath, embedded = false }) {
  const qc = useQueryClient()
  const { profile: staff } = useAuth()
  const [measurementDate, setMeasurementDate] = useState('')
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

  const {
    data: measurements = [],
    isLoading: loadingM,
    isError: mError,
    refetch: refetchM,
  } = useQuery({
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

  const hasProfileBasics = Boolean(client?.tgl_lahir && client?.jenis_kelamin)
  const hasAnthro = Boolean(latest?.berat_badan && latest?.tinggi_badan)

  const bmi = useMemo(() => {
    if (!hasAnthro) return null
    return calculateBMI(Number(latest.berat_badan), Number(latest.tinggi_badan))
  }, [hasAnthro, latest])

  const bmiCat = getBMICategory(bmi)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!staff?.id) throw new Error('Sesi tidak valid.')
      if (!measurementDate) throw new Error('Pilih tanggal pengukuran.')
      if (!hasAnthro) throw new Error('Belum ada data antropometri.')
      const bb = Number(latest.berat_badan)
      const tb = Number(latest.tinggi_badan)
      const { data: existing, error: e0 } = await supabase
        .from('body_measurements')
        .select('massa_otot, massa_lemak, catatan')
        .eq('user_id', clientId)
        .eq('tanggal', measurementDate)
        .maybeSingle()
      if (e0) throw e0
      const row = {
        user_id: clientId,
        tanggal: measurementDate,
        berat_badan: bb,
        tinggi_badan: tb,
        bmi: calculateBMI(bb, tb),
        massa_otot: existing?.massa_otot ?? null,
        massa_lemak: existing?.massa_lemak ?? null,
        catatan: existing?.catatan ?? null,
        created_by: staff.id,
      }
      const { error } = await supabase.from('body_measurements').upsert(row, {
        onConflict: 'user_id,tanggal',
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Data BMI disimpan.')
      qc.invalidateQueries({ queryKey: ['measurements', clientId] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
      qc.invalidateQueries({ queryKey: ['staff_clients_unified'] })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menyimpan.')
    },
  })

  const canSave =
    Boolean(measurementDate) &&
    hasAnthro &&
    hasProfileBasics &&
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
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">BMI — {formatDisplayName(client.nama)}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Nilai BB/TB diambil dari pengukuran antropometri terakhir. Pilih tanggal entri lalu simpan.
            </p>
          </div>
        </>
      ) : (
        <div>
          <h2 className="text-base font-semibold tracking-tight">BMI</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            BB/TB dari antropometri terakhir. Pilih tanggal lalu simpan.
          </p>
        </div>
      )}

        {!hasAnthro ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          >
            {embedded
              ? 'Belum ada data antropometri. Tambahkan pengukuran di tab Antropometri.'
              : 'Belum ada data antropometri untuk klien ini. Tambahkan pengukuran di tab Antropometri pada detail klien.'}
          </div>
        ) : null}

        {!hasProfileBasics ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          >
            {embedded
              ? 'Profil belum lengkap (tanggal lahir atau jenis kelamin). Lengkapi di tab Profil.'
              : 'Profil klien belum lengkap (tanggal lahir atau jenis kelamin). Lengkapi di manajemen user agar ringkasan konsisten.'}
          </div>
        ) : null}

        <Card className={cn('md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
          <CardHeader>
            <CardTitle className="text-base">Data saat ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Jenis kelamin</dt>
                <dd className="text-sm font-medium">{sexLabel(client.jenis_kelamin)}</dd>
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
              <Label htmlFor="bmi-tgl">Tanggal pengukuran</Label>
              <DatePicker id="bmi-tgl" value={measurementDate} onChange={setMeasurementDate} />
              {!measurementDate ? (
                <p className="text-xs text-destructive">Pilih tanggal untuk dapat menyimpan.</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-sm">
              <p>
                <span className="text-muted-foreground">BMI: </span>
                <span className="font-semibold tabular-nums">{bmi != null ? formatNumberId(bmi) : '—'}</span>
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Kategori: </span>
                <span className="font-medium">{bmiCat.label}</span>
              </p>
            </div>

            <Button type="button" disabled={!canSave} onClick={() => saveMutation.mutate()}>
              Simpan
            </Button>
          </CardContent>
        </Card>

        <Card className={cn('overflow-hidden', MOBILE_DASHBOARD_CARD_SHELL)}>
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Riwayat BMI</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <BmiHistoryTable
              measurements={measurements}
              page={historyPage}
              onPageChange={setHistoryPage}
              loading={loadingM}
              error={mError}
              onRetry={() => refetchM()}
            />
          </CardContent>
        </Card>

        {!embedded ? (
          <p className="text-center text-xs text-muted-foreground">
            <Link className="underline-offset-4 hover:underline" to={`${listBase}/bmi`}>
              Pilih klien lain
            </Link>
          </p>
        ) : null}
      </div>
  )

  if (embedded) return body

  return <AppShell>{body}</AppShell>
}

/** @deprecated Routes redirect to daftar klien; gunakan `BmiClientForm` dengan `embedded`. */
export function BmiStandalonePage() {
  const { clientId } = useParams()
  const location = useLocation()
  const base = location.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'
  const to = clientId ? `${base}?client=${encodeURIComponent(clientId)}&tab=bmi` : base
  return <Navigate to={to} replace />
}
