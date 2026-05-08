import { useMemo } from 'react'
import { formatDateId, formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

const METRIC_LABELS = {
  berat_badan: 'Berat Badan',
  bmi: 'BMI',
  massa_otot: 'Massa Otot',
  massa_lemak: 'Massa Lemak',
  lingkar_pinggang: 'Lingkar Pinggang',
}

export function ProgressTimeline({ measurements, selectedMetric, onMetricChange }) {
  const timelineData = useMemo(() => {
    if (!measurements.length) return []

    return [...measurements]
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .slice(-8) // Last 8 measurements
      .map((m) => ({
        date: m.tanggal,
        value: m[selectedMetric],
        displayDate: formatDateId(m.tanggal),
      }))
  }, [measurements, selectedMetric])

  const maxValue = useMemo(() => {
    const values = timelineData.map((d) => d.value).filter((v) => v != null)
    return values.length ? Math.max(...values) : 100
  }, [timelineData])

  const minValue = useMemo(() => {
    const values = timelineData.map((d) => d.value).filter((v) => v != null)
    return values.length ? Math.min(...values) : 0
  }, [timelineData])

  if (timelineData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20">
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

      {/* Timeline Chart */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
        <div className="relative">
          {/* Y-axis labels */}
          <div className="absolute -left-1 top-0 bottom-0 flex w-12 -translate-x-full flex-col justify-between text-xs text-muted-foreground">
            <span>{formatNumberId(maxValue)}</span>
            <span>{formatNumberId((maxValue + minValue) / 2)}</span>
            <span>{formatNumberId(minValue)}</span>
          </div>

          {/* Chart area */}
          <div className="ml-14">
            {/* Grid lines */}
            <div className="absolute inset-0 ml-14 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-dashed border-border/40" />
              <div className="border-t border-dashed border-border/40" />
              <div className="border-t border-dashed border-border/40" />
            </div>

            {/* Data points and line */}
            <svg
              className="h-40 w-full"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
            >
              {/* Line path */}
              <path
                d={generatePath(timelineData, minValue, maxValue)}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.3"
                className="text-primary"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Area fill */}
              <path
                d={generateAreaPath(timelineData, minValue, maxValue)}
                fill="currentColor"
                className="text-primary/10"
              />
            </svg>

            {/* X-axis labels */}
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {timelineData.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      d.value != null ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                  <span className="max-w-[3rem] truncate text-[10px]">{d.displayDate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function generatePath(data, min, max) {
  if (data.length === 0) return ''

  const range = max - min || 1
  const stepX = 100 / (data.length - 1 || 1)

  return data
    .map((d, i) => {
      if (d.value == null) return null
      const x = i * stepX
      const y = 40 - ((d.value - min) / range) * 36 // 36 to keep padding
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .filter(Boolean)
    .join(' ')
}

function generateAreaPath(data, min, max) {
  const linePath = generatePath(data, min, max)
  if (!linePath) return ''

  return `${linePath} L 100 40 L 0 40 Z`
}
