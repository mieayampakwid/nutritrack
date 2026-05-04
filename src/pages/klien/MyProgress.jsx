import { useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MeasurementChart } from '@/components/measurement/MeasurementChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useMeasurements } from '@/hooks/useMeasurement'
import { useUserEvaluations } from '@/hooks/useUserEvaluations'
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
import { formatDateId, formatNumberId } from '@/lib/format'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
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

  const measurements = useMemo(() => filterByRange(all, range), [all, range])

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 pb-1">
        <h1 className="text-center text-lg font-semibold tracking-tight text-white max-md:drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] sm:text-xl md:text-foreground">
          Progres pengukuran
        </h1>

        <Card className={cn('p-0', cardShell)}>
          <CardHeader className="space-y-0 border-b border-border/60 px-4 pb-3 pt-4 sm:px-5">
            <CardTitle className="text-base font-semibold tracking-tight">Periode dan metrik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Rentang waktu">
              <Button
                variant={range === '30d' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'min-h-9 flex-1 min-[380px]:flex-none',
                  range !== '30d' &&
                    '',
                )}
                onClick={() => setRange('30d')}
              >
                30 hari
              </Button>
              <Button
                variant={range === '3m' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'min-h-9 flex-1 min-[380px]:flex-none',
                  range !== '3m' &&
                    '',
                )}
                onClick={() => setRange('3m')}
              >
                3 bulan
              </Button>
              <Button
                variant={range === 'all' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'min-h-9 flex-1 min-[380px]:flex-none',
                  range !== 'all' &&
                    '',
                )}
                onClick={() => setRange('all')}
              >
                Semua
              </Button>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Metrik grafik
              </span>
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
          <CardHeader className="space-y-0 border-b border-border/60 px-4 pb-3 pt-4 text-center sm:px-5">
            <CardTitle className="text-base font-semibold tracking-tight">Evaluasi rutin</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
            {loadingEvals ? (
              <div className="py-8">
                <LoadingSpinner />
              </div>
            ) : evaluations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada evaluasi.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                        Periode
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                        Olahraga
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                        Istirahat
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                        Sayur
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                        BMI
                      </TableHead>
                      <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                        Catatan
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((e) => (
                      <TableRow key={e.id} className="max-md:text-[0.8125rem]">
                        <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">
                          {formatDateId(e.date_from)} — {formatDateId(e.date_to)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">
                          {e.exercise_freq ?? '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">
                          {e.sleep_enough == null ? '—' : e.sleep_enough ? 'Ya' : 'Tidak'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                          {e.veg_times_per_day == null ? '—' : formatNumberId(e.veg_times_per_day)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                          {e.bmi == null ? '—' : formatNumberId(e.bmi)}
                        </TableCell>
                        <TableCell className="min-w-[16rem] whitespace-pre-wrap px-2 text-left sm:px-3">
                          {[e.usage_notes, e.recommendations].filter(Boolean).join('\n\n') || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn('p-0', cardShell)}>
          <CardHeader className="space-y-0 border-b border-border/60 px-4 pb-3 pt-4 text-center sm:px-5">
            <CardTitle className="text-base font-semibold tracking-tight">Riwayat</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                      Tanggal
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                      BB
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                      TB
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                      BMI
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                      Otot
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                      Lemak
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...measurements]
                    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                    .map((m) => (
                      <TableRow key={m.id} className="max-md:text-[0.8125rem]">
                        <TableCell className="whitespace-nowrap px-2 text-center sm:px-3">
                          {formatDateId(m.tanggal)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                          {formatNumberId(m.berat_badan)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                          {formatNumberId(m.tinggi_badan)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                          {formatNumberId(m.bmi)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                          {formatNumberId(m.massa_otot)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-center tabular-nums sm:px-3">
                          {formatNumberId(m.massa_lemak)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {measurements.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Belum ada pengukuran.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
