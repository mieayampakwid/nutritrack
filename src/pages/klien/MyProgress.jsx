import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { MeasurementChart } from '@/components/measurement/MeasurementChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useMeasurements } from '@/hooks/useMeasurement'
import { useUserEvaluations } from '@/hooks/useUserEvaluations'
import { calculateBMI, getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
import { formatDateId, formatNumberId } from '@/lib/format'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function filterByRange(measurements, range) {
  if (range === 'all') return measurements
  const end = new Date()
  const start = new Date()
  if (range === '30d') start.setDate(end.getDate() - 30)
  if (range === '3m') start.setMonth(end.getMonth() - 3)
  const s = start.toISOString().slice(0, 10)
  return measurements.filter((m) => m.tanggal >= s)
}

function sexLabel(v) {
  if (v === 'male') return 'Laki-laki'
  if (v === 'female') return 'Perempuan'
  return '—'
}

function activityLabel(v) {
  if (v === 1.1) return 'Bed Rest (Istirahat)'
  if (v === 1.2) return 'Normal (Tidak bed rest)'
  return v != null ? String(v) : '—'
}

function stressLabel(v) {
  const map = {
    1.2: 'No stress (Tidak ada stress)',
    1.3: 'Mild stress (Stres ringan)',
    1.4: 'Moderate stress (Stres sedang)',
    1.5: 'Severe stress (Stres berat)',
    1.7: 'Head injury (Luka kepala berat)',
  }
  return map[v] ?? (v != null ? String(v) : '—')
}

const MAX_ASESMEN = 5
const cardShell = cn('overflow-hidden border-border/70 shadow-sm', MOBILE_DASHBOARD_CARD_SHELL)

export function MyProgress() {
  const { profile } = useAuth()
  const { data: all = [], isLoading } = useMeasurements(profile?.id, Boolean(profile?.id))
  const { data: evaluations = [], isLoading: loadingEvals } = useUserEvaluations(
    profile?.id,
    Boolean(profile?.id),
  )
  const [range, setRange] = useState('30d')
  const [metric, setMetric] = useState('berat_badan')
  const [detailAssessment, setDetailAssessment] = useState(null)

  const measurements = useMemo(() => filterByRange(all, range), [all, range])

  const asesmenLog = useMemo(() => {
    const seen = new Set()
    return [...all]
      .sort((a, b) => {
        const d = b.tanggal.localeCompare(a.tanggal)
        if (d !== 0) return d
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      })
      .filter((a) => {
        if (seen.has(a.tanggal)) return false
        seen.add(a.tanggal)
        return true
      })
      .slice(0, MAX_ASESMEN)
  }, [all])

  const measurementsDeduped = useMemo(() => {
    const seen = new Set()
    return [...measurements]
      .sort((a, b) => {
        const d = b.tanggal.localeCompare(a.tanggal)
        if (d !== 0) return d
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      })
      .filter((m) => {
        if (seen.has(m.tanggal)) return false
        seen.add(m.tanggal)
        return true
      })
  }, [measurements])

  const creatorIds = useMemo(
    () => [...new Set(all.map((a) => a.created_by).filter(Boolean))],
    [all],
  )

  const { data: creatorMap = {} } = useQuery({
    queryKey: ['profiles_creators', creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_profile_names', { profile_ids: creatorIds })
      if (error) throw error
      const map = {}
      for (const p of data ?? []) map[p.id] = p.nama
      return map
    },
  })

  const [detailCreator, setDetailCreator] = useState('')

  function openDetail(a) {
    setDetailAssessment(a)
    setDetailCreator(creatorMap[a.created_by] || '')
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 pb-1">
        <h1 className="text-center text-lg font-semibold tracking-tight text-white max-md:drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] sm:text-xl md:text-white">
          Progres pengukuran
        </h1>

        <Card className={cn('p-0', cardShell)}>
          <CardHeader className="space-y-0 border-b border-border/60 px-4 pb-3 pt-4 sm:px-5">
            <CardTitle className="text-base font-semibold tracking-tight">Periode dan metrik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Rentang waktu">
              <Button variant={range === '30d' ? 'default' : 'outline'} size="sm" className="min-h-9 flex-1 min-[380px]:flex-none" onClick={() => setRange('30d')}>30 hari</Button>
              <Button variant={range === '3m' ? 'default' : 'outline'} size="sm" className="min-h-9 flex-1 min-[380px]:flex-none" onClick={() => setRange('3m')}>3 bulan</Button>
              <Button variant={range === 'all' ? 'default' : 'outline'} size="sm" className="min-h-9 flex-1 min-[380px]:flex-none" onClick={() => setRange('all')}>Semua</Button>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Metrik grafik</span>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="h-11 w-full border-border/80 bg-transparent shadow-sm sm:h-9 sm:max-w-xs">
                  <SelectValue placeholder="Metrik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="berat_badan">Berat badan</SelectItem>
                  <SelectItem value="bmi">BMI</SelectItem>
                  <SelectItem value="massa_otot">Massa otot</SelectItem>
                  <SelectItem value="massa_lemak">Massa lemak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className={cn('p-8', cardShell)}>
            <LoadingSpinner />
          </Card>
        ) : (
          <Card className={cn('p-0', cardShell)}>
            <CardHeader className="space-y-0 border-b border-border/60 px-4 pb-3 pt-4 sm:px-5">
              <CardTitle className="text-base font-semibold tracking-tight">Grafik</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <MeasurementChart measurements={measurements} metric={metric} />
            </CardContent>
          </Card>
        )}

        <Card className={cn('p-0', cardShell)}>
          <CardHeader className="space-y-0 border-b border-border/60 px-4 pb-3 pt-4 sm:px-5">
            <CardTitle className="text-base font-semibold tracking-tight text-center">Evaluasi rutin</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
            {isLoading ? (
              <div className="py-8">
                <LoadingSpinner />
              </div>
            ) : asesmenLog.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada asesmen.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Tanggal</TableHead>
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Berat Badan</TableHead>
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">BMI</TableHead>
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Anjuran Kalori</TableHead>
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asesmenLog.map((a) => {
                      const bb = a.berat_badan
                      const tb = a.tinggi_badan
                      const bmi = a.bmi ?? calculateBMI(bb, tb)
                      const bmiCat = getBMICategoryAsiaPacific(bmi)
                      return (
                        <TableRow key={a.id} className="max-md:text-[0.8125rem]">
                          <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">
                            {formatDateId(a.tanggal)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                            {bb != null ? `${formatNumberId(bb)} kg` : '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                            {bmi != null ? (
                              <span>
                                {formatNumberId(bmi)}{' '}
                                <span className="text-muted-foreground">({bmiCat.label})</span>
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                            {a.anjuran_kalori_harian != null || a.energi_total != null ? (
                              <span>
                                {formatNumberId(a.anjuran_kalori_harian ?? a.energi_total)}{' '}
                                <span className="text-muted-foreground">kkal</span>
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              onClick={() => openDetail(a)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Lihat
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loadingEvals && evaluations.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rekomendasi ahli gizi
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Periode</TableHead>
                        <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Olahraga</TableHead>
                        <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Istirahat</TableHead>
                        <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Sayur</TableHead>
                        <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">BMI</TableHead>
                        <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluations.map((e) => (
                        <TableRow key={e.id} className="max-md:text-[0.8125rem]">
                          <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">{formatDateId(e.date_from)} — {formatDateId(e.date_to)}</TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">{e.exercise_freq ?? '—'}</TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">{e.sleep_enough == null ? '—' : e.sleep_enough ? 'Ya' : 'Tidak'}</TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">{e.veg_times_per_day == null ? '—' : formatNumberId(e.veg_times_per_day)}</TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">{e.bmi == null ? '—' : formatNumberId(e.bmi)}</TableCell>
                          <TableCell className="min-w-[16rem] whitespace-pre-wrap px-2 text-left sm:px-3">{[e.usage_notes, e.recommendations].filter(Boolean).join('\n\n') || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn('p-0', cardShell)}>
          <CardHeader className="space-y-0 border-b border-border/60 px-4 pb-3 pt-4 text-center sm:px-5">
            <CardTitle className="text-base font-semibold tracking-tight">Riwayat Perubahan Antropometri</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Tanggal</TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">BB</TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">TB</TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">BMI</TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Otot</TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">Lemak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measurementsDeduped
                    .map((m) => (
                      <TableRow key={m.id} className="max-md:text-[0.8125rem]">
                        <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">{formatDateId(m.tanggal)}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">{formatNumberId(m.berat_badan)}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">{formatNumberId(m.tinggi_badan)}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">{formatNumberId(m.bmi)}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">{formatNumberId(m.massa_otot)}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">{formatNumberId(m.massa_lemak)}</TableCell>
                      </TableRow>
                    ))}
                  {measurementsDeduped.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Belum ada pengukuran.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(detailAssessment)} onOpenChange={() => setDetailAssessment(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Laporan Asesmen</DialogTitle>
          </DialogHeader>
          {detailAssessment && (
            <div className="space-y-5 text-sm">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nama</span>
                  <span className="font-semibold text-foreground">{profile?.nama || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tanggal</span>
                  <span className="font-medium tabular-nums">{formatDateId(detailAssessment.tanggal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dievaluasi oleh</span>
                  <span className="font-medium">{detailCreator || '—'}</span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tanda vital</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Berat Badan</p>
                    <p className="text-base font-semibold tabular-nums">{detailAssessment.berat_badan != null ? `${formatNumberId(detailAssessment.berat_badan)} kg` : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tinggi Badan</p>
                    <p className="text-base font-semibold tabular-nums">{detailAssessment.tinggi_badan != null ? `${formatNumberId(detailAssessment.tinggi_badan)} cm` : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Umur</p>
                    <p className="text-base font-semibold tabular-nums">{detailAssessment.umur != null ? `${detailAssessment.umur} tahun` : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Jenis Kelamin</p>
                    <p className="text-base font-semibold">{sexLabel(detailAssessment.jenis_kelamin)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Komposisi tubuh</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Otot</p>
                    <p className="text-base font-semibold tabular-nums">{detailAssessment.massa_otot != null ? `${formatNumberId(detailAssessment.massa_otot)} kg` : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lemak</p>
                    <p className="text-base font-semibold tabular-nums">{detailAssessment.massa_lemak != null ? `${formatNumberId(detailAssessment.massa_lemak)}%` : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">L. Pinggang</p>
                    <p className="text-base font-semibold tabular-nums">{detailAssessment.lingkar_pinggang != null ? `${formatNumberId(detailAssessment.lingkar_pinggang)} cm` : '—'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kalkulasi klinis</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">BMI</p>
                    <p className="text-base font-semibold tabular-nums">
                      {detailAssessment.bmi != null ? (
                        <>{formatNumberId(detailAssessment.bmi)} <span className="text-xs font-normal text-muted-foreground">({getBMICategoryAsiaPacific(detailAssessment.bmi).label})</span></>
                      ) : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">BMR</p>
                    <p className="text-base font-semibold tabular-nums">{detailAssessment.bmr != null ? `${formatNumberId(detailAssessment.bmr)} kkal` : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">F. Aktivitas</p>
                    <p className="text-sm font-semibold">{activityLabel(detailAssessment.faktor_aktivitas)}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">F. Stres</p>
                    <p className="text-sm font-semibold">{stressLabel(detailAssessment.faktor_stres)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-primary/20 bg-primary/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Total energi</p>
                    <p className="text-lg font-bold tabular-nums">{detailAssessment.energi_total != null ? `${formatNumberId(detailAssessment.energi_total)} kkal/hari` : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Anjuran kalori</p>
                    <p className="text-lg font-bold tabular-nums text-primary">
                      {detailAssessment.anjuran_kalori_harian != null
                        ? `${formatNumberId(detailAssessment.anjuran_kalori_harian)} kkal/hari`
                        : detailAssessment.energi_total != null
                          ? `${formatNumberId(detailAssessment.energi_total)} kkal/hari`
                          : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {detailAssessment.catatan_asesmen && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Catatan asesmen</p>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{detailAssessment.catatan_asesmen}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
