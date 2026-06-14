import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { useState, useSyncExternalStore } from 'react'
import { LayoutGroup, motion as Motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { usePopularFoodTrend } from '@/hooks/usePopularFoodTrend'
import { formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

const RANGE_TABS = [
  { value: '1d', label: 'Harian' },
  { value: '7d', label: 'Mingguan' },
  { value: '1mo', label: 'Bulanan' },
]

const BAR_FILL = 'var(--color-primary)'

const LABEL_GAP = 8

const tabChipSpring = { type: 'spring', stiffness: 450, damping: 34, mass: 0.85 }
const tabLabelActive = { scale: [1, 1.1, 1], y: [0, -0.5, 0] }
const tabLabelIdle = { scale: 1, y: 0 }

/** Tailwind `md` — column chart on desktop, horizontal bars below. */
function useDesktopChartLayout() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(min-width: 768px)')
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false,
  )
}

function truncateLabel(s, max = 36) {
  const t = String(s ?? '')
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * Recharts LabelList does not pass `payload` into custom label content (it is stripped).
 * Resolve the row by `index` against chartData from the parent scope.
 */
function renderBarTopLabel(chartData, { fontSize = 11 } = {}) {
  return function BarTopLabelContent(props) {
    const { index, viewBox } = props
    const x = props.x ?? viewBox?.x
    const y = props.y ?? viewBox?.y
    const width = props.width ?? viewBox?.width
    const row = chartData?.[index]
    if (row == null || x == null || y == null || width == null) return null
    const cx = Number(x) + Number(width) / 2
    const cy = Number(y) - 6
    const num = formatNumberId(Number(row.frekuensi))
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="auto"
        fontSize={fontSize}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="var(--color-primary)"
        fontWeight={700}
        style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
      >
        {num}
      </text>
    )
  }
}

function renderBarEndLabel(chartData, { fontSize = 11 } = {}) {
  return function BarEndLabelContent(props) {
    const { index, viewBox } = props
    const x = props.x ?? viewBox?.x
    const y = props.y ?? viewBox?.y
    const width = props.width ?? viewBox?.width
    const height = props.height ?? viewBox?.height
    const row = chartData?.[index]
    if (row == null || x == null || y == null || width == null || height == null) return null
    const food = truncateLabel(row.food)
    const num = formatNumberId(Number(row.frekuensi))
    const lx = Number(x) + Number(width) + LABEL_GAP
    const cy = Number(y) + Number(height) / 2
    return (
      <text
        x={lx}
        y={cy}
        dominantBaseline="middle"
        textAnchor="start"
        fontSize={fontSize}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="var(--color-foreground)"
        style={{ pointerEvents: 'none' }}
      >
        <tspan fontWeight={600}>{food}</tspan>
        <tspan fill="var(--color-muted-foreground)" fontWeight={500}>
          {' : '}
        </tspan>
        <tspan fill="var(--color-primary)" fontWeight={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {num}
        </tspan>
      </text>
    )
  }
}

export function PopularFoodsTrendCard({ className }) {
  const [range, setRange] = useState(/** @type {'1d' | '7d' | '1mo'} */ ('7d'))
  const isDesktop = useDesktopChartLayout()
  const { data, isLoading, isError, error } = usePopularFoodTrend(range)

  return (
    <Card className={cn('min-w-0 rounded-2xl border-border/70 shadow-sm', className)}>
      <CardHeader className="flex flex-col gap-2 space-y-0 px-4 pt-3 pb-0 sm:px-5 lg:px-8 lg:pt-5">
        <CardTitle className="text-center text-base font-semibold sm:text-lg md:text-xl">
          Makanan populer
        </CardTitle>
        <Tabs value={range} onValueChange={(v) => setRange(/** @type {'1d' | '7d' | '1mo'} */ (v))} className="w-full px-1 pb-0 pt-0.5 sm:px-2 sm:pt-1 lg:px-3">
          <LayoutGroup id="popular-food-range-tabs">
            <TabsList
              className="relative mx-auto grid h-auto w-full max-w-[17.5rem] grid-cols-3 gap-px overflow-hidden rounded-lg p-1.5 sm:inline-flex sm:max-w-none sm:w-auto"
              aria-label="Rentang waktu grafik"
            >
              {RANGE_TABS.map((t) => {
                const isActive = range === t.value
                return (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className={cn(
                      'relative isolate z-10 min-h-8 flex-1 rounded-[5px] border-0 bg-transparent px-2 py-1.5 text-xs leading-tight shadow-none',
                      'text-muted-foreground transition-colors duration-150',
                      'data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'sm:min-h-8 sm:px-2.5 sm:py-1.5 sm:text-sm md:text-[0.9375rem]',
                    )}
                  >
                    {isActive && (
                      <Motion.span
                        layoutId="popular-food-tab-chip"
                        transition={tabChipSpring}
                        className="pointer-events-none absolute -inset-px z-0 rounded-[5px] border border-white/40 bg-background/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_10px_rgba(0,0,0,0.08)] ring-1 ring-white/25 backdrop-blur-md"
                      />
                    )}
                    <Motion.span
                      className="relative z-10 inline-flex items-center justify-center font-medium"
                      animate={isActive ? tabLabelActive : tabLabelIdle}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                    >
                      {t.label}
                    </Motion.span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </LayoutGroup>
        </Tabs>
      </CardHeader>
      <CardContent className="px-4 pb-0 pt-1.5 sm:px-5 sm:pt-2 lg:px-8 lg:pt-3">
        {isLoading && (
          <div className="flex h-[360px] items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
        {isError && (
          <p className="py-8 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : 'Gagal memuat data.'}
          </p>
        )}
        {!isLoading && !isError && data && !data.hasData && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada data log makanan pada rentang ini.
          </p>
        )}
        {!isLoading && !isError && data?.hasData && (
          <Motion.div
            key={`${range}-${isDesktop ? 'col' : 'row'}`}
            className="h-[360px] w-full min-w-0 pointer-events-none select-none"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {isDesktop ? (
                <BarChart
                  data={data.chartData}
                  margin={{ top: 30, right: 12, left: 8, bottom: 76 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    type="category"
                    dataKey="food"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => truncateLabel(String(v), 14)}
                    angle={-38}
                    textAnchor="end"
                    height={72}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={42}
                  />
                  <Bar
                    dataKey="frekuensi"
                    name="Frekuensi"
                    fill={BAR_FILL}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    isAnimationActive
                    animationDuration={520}
                    animationEasing="ease-out"
                    animationBegin={80}
                    activeBar={false}
                  >
                    <LabelList
                      dataKey="frekuensi"
                      position="top"
                      content={renderBarTopLabel(data.chartData, { fontSize: 13 })}
                    />
                  </Bar>
                </BarChart>
              ) : (
                <BarChart
                  layout="vertical"
                  data={data.chartData}
                  margin={{ top: 10, right: 200, left: 12, bottom: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis type="category" dataKey="food" width={0} tick={false} axisLine={false} hide />
                  <Bar
                    dataKey="frekuensi"
                    name="Frekuensi"
                    fill={BAR_FILL}
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                    isAnimationActive
                    animationDuration={520}
                    animationEasing="ease-out"
                    animationBegin={80}
                    activeBar={false}
                  >
                    <LabelList
                      dataKey="frekuensi"
                      position="right"
                      content={renderBarEndLabel(data.chartData, { fontSize: 12 })}
                    />
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </Motion.div>
        )}
      </CardContent>
    </Card>
  )
}
