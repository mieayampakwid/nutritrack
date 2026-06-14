import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDateId, formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

const METRIC_LABELS = {
  berat_badan: 'Berat Badan',
  bmi: 'BMI',
  massa_otot: 'Massa Otot',
  massa_lemak: 'Massa Lemak',
  lingkar_pinggang: 'Lingkar Pinggang',
}

const tooltipStyles = {
  backgroundColor: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-popover-foreground)',
  fontSize: '13px',
  boxShadow: '0 8px 24px -8px color-mix(in oklab, var(--color-foreground) 18%, transparent)',
}

export function ProgressTimeline({ measurements, selectedMetric, onMetricChange }) {
  const chartData = useMemo(() => {
    if (!measurements.length) return []

    return [...measurements]
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .slice(-8)
      .map((m) => ({
        tanggal: m.tanggal,
        label: formatDateId(m.tanggal),
        value: m[selectedMetric] != null ? Number(m[selectedMetric]) : null,
      }))
  }, [measurements, selectedMetric])

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Belum ada data pengukuran</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(METRIC_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onMetricChange(key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              selectedMetric === key
                ? 'border-emerald-600/60 bg-emerald-100/95 text-emerald-950 shadow-sm shadow-emerald-500/15 ring-2 ring-emerald-500/25'
                : 'border-emerald-500/40 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100/90',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
              opacity={0.5}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              interval="preserveStartEnd"
              height={36}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'currentColor' }}
              tickLine={false}
              axisLine={false}
              width={50}
              domain={['auto', 'auto']}
              tickFormatter={(v) => formatNumberId(v)}
            />
            <Tooltip
              formatter={(v) => formatNumberId(v)}
              labelFormatter={(_, p) => p?.[0]?.payload?.label ?? ''}
              contentStyle={tooltipStyles}
              labelStyle={{ color: 'var(--color-muted-foreground)', marginBottom: 4 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 0, fill: '#059669' }}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
