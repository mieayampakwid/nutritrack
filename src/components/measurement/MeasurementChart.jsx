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

const MEALS = ['pagi', 'siang', 'malam', 'snack']

export function MeasurementChart({ measurements, metric }) {
  const data = (measurements ?? []).map((m) => ({
    tanggal: m.tanggal,
    label: formatDateId(m.tanggal),
    berat_badan: m.berat_badan != null ? Number(m.berat_badan) : null,
    bmi: m.bmi != null ? Number(m.bmi) : null,
    massa_otot: m.massa_otot != null ? Number(m.massa_otot) : null,
    massa_lemak: m.massa_lemak != null ? Number(m.massa_lemak) : null,
  }))

  const key =
    metric === 'berat_badan'
      ? 'berat_badan'
      : metric === 'bmi'
        ? 'bmi'
        : metric === 'massa_otot'
          ? 'massa_otot'
          : 'massa_lemak'

  const labels = {
    berat_badan: 'Berat badan (kg)',
    bmi: 'BMI',
    massa_otot: 'Massa otot (kg)',
    massa_lemak: 'Massa lemak (%)',
  }

  if (!data.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Belum ada data pengukuran.
      </p>
    )
  }

  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            formatter={(v) => [formatNumberId(v), labels[key]]}
            labelFormatter={(_, p) => p?.[0]?.payload?.label ?? ''}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={key}
            name={labels[key]}
            stroke="#1e293b"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
