import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
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
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { formatNumberId, toIsoDateLocal } from '@/lib/format'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const BAR_OK = 'hsl(142 64% 42%)'
const BAR_OVER = 'hsl(32 95% 44%)'
const BAR_NEUTRAL = 'var(--color-primary)'

const tooltipStyles = {
  backgroundColor: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  color: 'var(--color-popover-foreground)',
  fontSize: '13px',
  boxShadow: '0 8px 24px -8px color-mix(in oklab, var(--color-foreground) 18%, transparent)',
}

/** Last N calendar days through today (oldest → newest). */
const CHART_DAY_COUNT = 30

function buildDailySeries(logs, targetKcal, numDays) {
  const byTanggal = new Map()
  for (const log of logs ?? []) {
    const key = log.tanggal
    if (!key) continue
    const add = Number(log.total_kalori) || 0
    byTanggal.set(key, (byTanggal.get(key) ?? 0) + add)
  }

  const rows = []
  const today = new Date()
  const span = Math.max(1, numDays) - 1
  for (let i = span; i >= 0; i -= 1) {
    const d = subDays(today, i)
    const iso = toIsoDateLocal(d)
    const kcal = iso ? (byTanggal.get(iso) ?? 0) : 0
    const hasTarget = targetKcal != null && Number(targetKcal) > 0
    const t = hasTarget ? Number(targetKcal) : null
    const over = t != null && kcal > t
    rows.push({
      iso,
      label: iso ? format(d, 'd MMM', { locale: idLocale }) : '',
      kcal,
      fill: !hasTarget ? BAR_NEUTRAL : over ? BAR_OVER : BAR_OK,
    })
  }
  return rows
}

function ChartLegend({ hasTarget, isAnjuran }) {
  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground"
      role="legend"
    >
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex h-2.5 w-4 rounded-sm bg-[hsl(142_64%_42%)] ring-1 ring-black/10" aria-hidden />
        <span>Asupan harian</span>
      </span>
      {hasTarget ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-0 w-8 border-t-2 border-dashed border-primary"
            aria-hidden
          />
          <span className="text-foreground">Garis putus: {isAnjuran ? 'anjuran kalori' : 'target kalori'}</span>
        </span>
      ) : null}
    </div>
  )
}

/**
 * @param {{ userId: string | undefined; className?: string }} props
 */
export function DailyCalorieChart({ userId, className }) {
  const enabled = Boolean(userId)

  const { data: logs = [], isLoading: logsLoading } = useFoodLogsForUser(userId, {
    enabled,
    recentDays: CHART_DAY_COUNT,
  })

  const { data: latestAssessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ['assessments', userId, 'latest'],
    enabled,
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
    () => buildDailySeries(logs, hasTarget ? targetKcal : null, CHART_DAY_COUNT),
    [logs, targetKcal, hasTarget],
  )

  const yMax = useMemo(() => {
    const maxBar = chartData.reduce((m, r) => Math.max(m, r.kcal), 0)
    const t = hasTarget ? Number(targetKcal) : 0
    const base = Math.max(maxBar, t, 1)
    return Math.ceil(base * 1.12)
  }, [chartData, hasTarget, targetKcal])

  const loading = logsLoading || assessmentLoading

  return (
    <Card
      className={cn(
        'border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04]',
        MOBILE_DASHBOARD_CARD_SHELL,
        className,
      )}
    >
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base font-semibold">Kalori harian (30 hari)</CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Total kalori per hari dari log makanan (30 hari terakhir). Batang hijau = di bawah atau sama
          dengan target; jingga = di atas target.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center py-6">
            <LoadingSpinner />
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
                    interval={4}
                    angle={-32}
                    textAnchor="end"
                    height={48}
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
                      stroke="var(--color-primary)"
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
                                fill="var(--color-primary)"
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
