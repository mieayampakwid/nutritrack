import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDateId, formatNumberId } from '@/lib/format'

const tooltipStyles = {
  backgroundColor: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-popover-foreground)',
  fontSize: '13px',
  boxShadow: '0 8px 24px -8px color-mix(in oklab, var(--color-foreground) 18%, transparent)',
}

export function MeasurementChart({ measurements, metric }) {
  const data = (measurements ?? []).map((m) => ({
    tanggal: m.tanggal,
    label: formatDateId(m.tanggal),
    berat_badan: m.berat_badan != null ? Number(m.berat_badan) : null,
    bmi: m.bmi != null ? Number(m.bmi) : null,
    massa_otot: m.massa_otot != null ? Number(m.massa_otot) : null,
    massa_lemak: m.massa_lemak != null ? Number(m.massa_lemak) : null,
    lingkar_pinggang: m.lingkar_pinggang != null ? Number(m.lingkar_pinggang) : null,
  }))

  const key =
    metric === 'berat_badan'
      ? 'berat_badan'
      : metric === 'bmi'
        ? 'bmi'
        : metric === 'massa_otot'
          ? 'massa_otot'
          : metric === 'lingkar_pinggang'
            ? 'lingkar_pinggang'
            : 'massa_lemak'

  const labels = {
    berat_badan: 'Berat badan (kg)',
    bmi: 'BMI',
    massa_otot: 'Massa otot (kg)',
    massa_lemak: 'Massa lemak (%)',
    lingkar_pinggang: 'Lingkar pinggang (cm)',
  }

  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada data pengukuran.
      </p>
    )
  }

  const axisTick = { fontSize: 11, fill: 'currentColor' }

  return (
    <div className="h-[min(52vw,320px)] min-h-[220px] w-full min-w-0 text-neutral-800 md:text-card-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 4, left: -8, bottom: 4 }}
          className="text-[0.6875rem] sm:text-xs"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
            opacity={0.85}
          />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            interval="preserveStartEnd"
            height={36}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(v) => [formatNumberId(v), labels[key]]}
            labelFormatter={(_, p) => p?.[0]?.payload?.label ?? ''}
            contentStyle={tooltipStyles}
            labelStyle={{ color: 'var(--color-muted-foreground)', marginBottom: 4 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 12, fontSize: '12px', color: 'currentColor' }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey={key}
            name={labels[key]}
            stroke="#059669"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: '#059669' }}
            activeDot={{ r: 5, strokeWidth: 0, fill: '#059669' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
