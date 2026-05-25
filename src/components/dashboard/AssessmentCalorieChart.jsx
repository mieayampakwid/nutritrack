import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { formatNumberId } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const BAR_OK = 'hsl(142 64% 42%)'
const BAR_OVER = 'hsl(0 72% 51%)'
const BAR_NEUTRAL = 'var(--color-primary)'

const tooltipStyles = {
  backgroundColor: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-popover-foreground)',
  fontSize: '13px',
  boxShadow: '0 8px 24px -8px color-mix(in oklab, var(--color-foreground) 18%, transparent)',
}

function buildDailySeries(logs, targetKcal, dateFrom, dateTo) {
  const byTanggal = new Map()
  for (const log of logs ?? []) {
    const key = log.tanggal
    if (!key) continue
    const add = Number(log.total_kalori) || 0
    byTanggal.set(key, (byTanggal.get(key) ?? 0) + add)
  }

  const start = parseISO(dateFrom)
  const end = parseISO(dateTo)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return []

  const days = eachDayOfInterval({ start, end })

  const hasTarget = targetKcal != null && Number(targetKcal) > 0
  const t = hasTarget ? Number(targetKcal) : null

  return days.map((d) => {
    const iso = format(d, 'yyyy-MM-dd')
    const kcal = byTanggal.get(iso) ?? 0
    const over = t != null && kcal > t
    return {
      iso,
      label: format(d, 'd MMM', { locale: idLocale }),
      kcal,
      fill: !hasTarget ? BAR_NEUTRAL : over ? BAR_OVER : BAR_OK,
    }
  })
}

function ChartLegend({ hasTarget, isAnjuran }) {
  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground"
      role="legend"
    >
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex h-2.5 w-4 rounded-sm bg-[hsl(142_64%_42%)] ring-1 ring-black/10" aria-hidden />
        <span>Di bawah / sama dengan target</span>
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex h-2.5 w-4 rounded-sm bg-[hsl(0_72%_51%)] ring-1 ring-black/10" aria-hidden />
        <span>Di atas target</span>
      </span>
      {hasTarget ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-0 w-8 border-t-2 border-dashed border-red-500"
            aria-hidden
          />
          <span className="text-foreground">
            Garis putus: {isAnjuran ? 'anjuran kalori' : 'target kalori'}
          </span>
        </span>
      ) : null}
    </div>
  )
}

/**
 * Daily calorie chart for the assessment page.
 * Scoped to the date range selected by DateRangeFilter.
 *
 * @param {{ userId: string; dateFrom: string; dateTo: string; className?: string }} props
 */
export function AssessmentCalorieChart({ userId, dateFrom, dateTo, onDateChange, className }) {
  const enabled = Boolean(userId) && Boolean(dateFrom) && Boolean(dateTo)

  const { data: logs = [], isLoading: logsLoading } = useFoodLogsForUser(userId, {
    enabled,
    dateFrom,
    dateTo,
  })

  const { data: latestAssessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ['assessments', userId, 'latest'],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      return data?.[0] ?? null
    },
  })

  const targetKcal = latestAssessment?.anjuran_kalori_harian ?? latestAssessment?.energi_total
  const hasTarget = targetKcal != null && Number(targetKcal) > 0
  const isAnjuran = latestAssessment?.anjuran_kalori_harian != null

  const chartData = useMemo(
    () => buildDailySeries(logs, hasTarget ? targetKcal : null, dateFrom, dateTo),
    [logs, targetKcal, hasTarget, dateFrom, dateTo],
  )

  const yMax = useMemo(() => {
    const maxBar = chartData.reduce((m, r) => Math.max(m, r.kcal), 0)
    const t = hasTarget ? Number(targetKcal) : 0
    const base = Math.max(maxBar, t, 1)
    return Math.ceil(base * 1.12)
  }, [chartData, hasTarget, targetKcal])

  const loading = logsLoading || assessmentLoading
  const hasData = chartData.some((r) => r.kcal > 0)

  return (
    <Card
      className={cn(
        'border-border/80 bg-card shadow-md',
        className,
      )}
    >
      <CardHeader className="space-y-1 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Kalori harian</CardTitle>
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={onDateChange}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Total kalori per hari dari log makanan dalam rentang tanggal yang dipilih.
          {hasTarget
            ? ` Garis merah putus-putus menunjukkan ${isAnjuran ? 'anjuran kalori harian' : 'target kalori'}.`
            : ''}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : !hasData ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada data log makanan untuk rentang tanggal yang dipilih.
            </p>
          </div>
        ) : (
          <>
            <div className="h-[min(52vw,300px)] min-h-[220px] w-full min-w-0 text-neutral-800 md:text-card-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: hasTarget ? 26 : 8,
                    right: 8,
                    left: 0,
                    bottom: 12,
                  }}
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
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    interval={chartData.length > 14 ? Math.floor(chartData.length / 7) : 0}
                    angle={chartData.length > 10 ? -32 : 0}
                    textAnchor={chartData.length > 10 ? 'end' : 'middle'}
                    height={chartData.length > 10 ? 48 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={[0, yMax]}
                    tickFormatter={(v) => formatNumberId(v)}
                  />
                  <Tooltip
                    formatter={(v) => [`${formatNumberId(v)} kkal`, 'Total']}
                    labelFormatter={(_, p) => {
                      const iso = p?.[0]?.payload?.iso
                      return iso ? `Tanggal ${iso}` : ''
                    }}
                    contentStyle={tooltipStyles}
                    labelStyle={{ color: 'var(--color-muted-foreground)', marginBottom: 4 }}
                  />
                  <Bar dataKey="kcal" name="Asupan harian" radius={[3, 3, 0, 0]} maxBarSize={14}>
                    {chartData.map((row) => (
                      <Cell key={row.iso} fill={row.fill} />
                    ))}
                  </Bar>
                  {hasTarget ? (
                    <ReferenceLine
                      y={Number(targetKcal)}
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      ifOverflow="extendDomain"
                      label={
                        <Label
                          content={(props) => {
                            const vb = props.viewBox
                            if (vb == null || vb.width == null) return null
                            const text = `${formatNumberId(Number(targetKcal))} kkal`
                            const x = vb.x + vb.width - 8
                            const y = (vb.y ?? 0) - 5
                            return (
                              <text
                                x={x}
                                y={y}
                                textAnchor="end"
                                fill="#ef4444"
                                fontSize={12}
                                fontWeight={700}
                                style={{ fontFamily: 'system-ui, sans-serif' }}
                                className="recharts-reference-line-label"
                              >
                                {text}
                              </text>
                            )
                          }}
                        />
                      }
                    />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend hasTarget={hasTarget} isAnjuran={isAnjuran} />
            {!hasTarget ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Target kalori akan tampil setelah ada asesmen kebutuhan energi.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
