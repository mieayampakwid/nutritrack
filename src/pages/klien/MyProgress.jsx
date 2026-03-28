import { useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { MeasurementChart } from '@/components/measurement/MeasurementChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useMeasurements } from '@/hooks/useMeasurement'
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

function filterByRange(measurements, range) {
  if (range === 'all') return measurements
  const end = new Date()
  const start = new Date()
  if (range === '30d') start.setDate(end.getDate() - 30)
  if (range === '3m') start.setMonth(end.getMonth() - 3)
  const s = start.toISOString().slice(0, 10)
  return measurements.filter((m) => m.tanggal >= s)
}

export function MyProgress() {
  const { profile } = useAuth()
  const { data: all = [], isLoading } = useMeasurements(profile?.id, Boolean(profile?.id))
  const [range, setRange] = useState('30d')
  const [metric, setMetric] = useState('berat_badan')

  const measurements = useMemo(() => filterByRange(all, range), [all, range])

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            <Button
              variant={range === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange('30d')}
            >
              30 hari
            </Button>
            <Button
              variant={range === '3m' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange('3m')}
            >
              3 bulan
            </Button>
            <Button
              variant={range === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange('all')}
            >
              Semua
            </Button>
          </div>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-[200px]">
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

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <MeasurementChart measurements={measurements} metric={metric} />
        )}

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">BB</TableHead>
                    <TableHead className="text-right">TB</TableHead>
                    <TableHead className="text-right">BMI</TableHead>
                    <TableHead className="text-right">Otot</TableHead>
                    <TableHead className="text-right">Lemak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...measurements]
                    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                    .map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDateId(m.tanggal)}</TableCell>
                        <TableCell className="text-right">{formatNumberId(m.berat_badan)}</TableCell>
                        <TableCell className="text-right">{formatNumberId(m.tinggi_badan)}</TableCell>
                        <TableCell className="text-right">{formatNumberId(m.bmi)}</TableCell>
                        <TableCell className="text-right">{formatNumberId(m.massa_otot)}</TableCell>
                        <TableCell className="text-right">{formatNumberId(m.massa_lemak)}</TableCell>
                      </TableRow>
                    ))}
                  {measurements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
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
