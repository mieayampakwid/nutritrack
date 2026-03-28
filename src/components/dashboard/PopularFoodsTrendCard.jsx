import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { usePopularFoodTrend } from '@/hooks/usePopularFoodTrend'
import { formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

const RANGE_OPTIONS = [
  { value: 'daily', label: 'Harian (30 hari terakhir)' },
  { value: 'monthly', label: 'Bulanan (12 bulan terakhir)' },
  { value: 'yearly', label: 'Tahunan (5 tahun terakhir)' },
]

const BAR_FILL = 'hsl(var(--primary))'

function truncateAxisLabel(s, max = 22) {
  const t = String(s ?? '')
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function PopularFoodsTrendCard({ className }) {
  const [range, setRange] = useState(/** @type {'daily' | 'monthly' | 'yearly'} */ ('daily'))
  const { data, isLoading, isError, error } = usePopularFoodTrend(range)

  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Makanan populer</CardTitle>
          <CardDescription>
            Frekuensi entri per nama makanan pada rentang waktu yang dipilih.
          </CardDescription>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v)}>
          <SelectTrigger className="w-full sm:w-[240px]" aria-label="Rentang waktu grafik">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex h-[320px] items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {error instanceof Error ? error.message : 'Gagal memuat data.'}
          </p>
        )}
        {!isLoading && !isError && data && !data.hasData && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Belum ada data log makanan pada rentang ini.
          </p>
        )}
        {!isLoading && !isError && data?.hasData && (
          <div className="h-[360px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chartData}
                margin={{ top: 8, right: 12, left: 4, bottom: 64 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="food"
                  type="category"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-32}
                  textAnchor="end"
                  height={56}
                  tickFormatter={truncateAxisLabel}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={44}
                  allowDecimals={false}
                  label={{
                    value: 'Frekuensi',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
                  }}
                />
                <Tooltip
                  formatter={(v) => [formatNumberId(v), 'Frekuensi']}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="frekuensi" name="Frekuensi" fill={BAR_FILL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
