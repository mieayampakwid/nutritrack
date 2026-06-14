import { useMemo, useState, useEffect } from 'react'
import { FlagBanner, Hamburger, PersonSimpleRun } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { useExerciseLogsForUser } from '@/hooks/useExerciseLog'
import { formatNumberId, toIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const DONUT_SIZE = 104
const DONUT_STROKE = 10
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

const DONUT_TRACK = 'hsl(210 12% 90%)'
const DONUT_PRIMARY = 'var(--color-primary)'
const DONUT_OVER = 'hsl(5 72% 52%)'

function sumField(list, field) {
  return (list ?? []).reduce((s, row) => s + (Number(row[field]) || 0), 0)
}

export function CalorieSummaryCard({ userId, className }) {
  const today = toIsoDateLocal(new Date())

  const { data: foodLogs = [], isLoading: foodLoading } = useFoodLogsForUser(userId, {
    enabled: Boolean(userId),
    dateFrom: today,
    dateTo: today,
  })

  const { data: exerciseLogs = [], isLoading: exerciseLoading } = useExerciseLogsForUser(userId, {
    enabled: Boolean(userId),
    dateFrom: today,
    dateTo: today,
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

  const loading = foodLoading || exerciseLoading || assessmentLoading

  const targetKcal = latestAssessment?.anjuran_kalori_harian ?? latestAssessment?.energi_total
  const consumedKcal = useMemo(() => sumField(foodLogs, 'total_kalori'), [foodLogs])
  const burnedKcal = useMemo(() => sumField(exerciseLogs, 'kalori_estimasi'), [exerciseLogs])

  const hasTarget = targetKcal != null && Number(targetKcal) > 0
  const remaining = hasTarget ? Number(targetKcal) - consumedKcal : 0
  const overBudget = hasTarget && consumedKcal > Number(targetKcal)

  const donutRatio = useMemo(() => {
    if (!hasTarget) return 0
    return Math.min(consumedKcal / Number(targetKcal), 1)
  }, [hasTarget, targetKcal, consumedKcal])

  const excessRatio = useMemo(() => {
    if (!hasTarget || !overBudget) return 0
    return (consumedKcal - Number(targetKcal)) / Number(targetKcal)
  }, [hasTarget, targetKcal, consumedKcal, overBudget])

  return (
    <div className={cn('rounded-2xl bg-white/95 shadow-sm ring-1 ring-black/5 backdrop-blur-sm', className)}>
      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !hasTarget ? (
        <div className="px-4 py-4 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Belum ada target kalori</p>
          <p className="mt-1 text-xs">Silakan hubungi ahli gizi untuk melakukan asesmen kebutuhan energi.</p>
        </div>
      ) : (
        <div className="flex items-center gap-4 pl-4 pr-5 py-3">
          <div className="relative h-[104px] w-[104px] shrink-0">
            <Donut ratio={donutRatio} overBudget={overBudget} excessRatio={excessRatio} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
                Sisa
              </span>
              <span
                className={cn(
                  'text-lg font-bold tabular-nums leading-none',
                  overBudget ? 'text-amber-600' : 'text-foreground',
                )}
              >
                {formatNumberId(remaining)}
              </span>
              <span className="text-[0.625rem] font-medium text-muted-foreground">
                kkal
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2.5 text-sm">
            <div className="flex items-center gap-2">
              <FlagBanner className="h-4 w-4 shrink-0 text-teal-600" weight="fill" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Target Kalori</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatNumberId(targetKcal)} <span className="text-xs font-normal text-muted-foreground">kkal</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Hamburger className="h-4 w-4 shrink-0 text-amber-600" weight="fill" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Makanan</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatNumberId(consumedKcal)} <span className="text-xs font-normal text-muted-foreground">kkal</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PersonSimpleRun className="h-4 w-4 shrink-0 text-blue-600" weight="fill" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Olahraga</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatNumberId(burnedKcal)} <span className="text-xs font-normal text-muted-foreground">kkal</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Donut({ ratio, overBudget, excessRatio }) {
  const clampedRatio = Math.min(ratio, 1)
  const targetOffset = DONUT_CIRCUMFERENCE * (1 - clampedRatio)
  const excessOffset = DONUT_CIRCUMFERENCE * (1 - excessRatio)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const transitionStyle = mounted
    ? 'stroke-dashoffset 0.85s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.35s ease-out'
    : 'none'

  return (
    <svg
      viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
      className="h-full w-full -rotate-90"
      aria-hidden
    >
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(210 6% 78%)" strokeWidth="1.5" />
        </pattern>
      </defs>
      <circle
        cx={DONUT_SIZE / 2}
        cy={DONUT_SIZE / 2}
        r={DONUT_RADIUS}
        fill="none"
        stroke={DONUT_TRACK}
        strokeWidth={DONUT_STROKE}
      />
      <circle
        cx={DONUT_SIZE / 2}
        cy={DONUT_SIZE / 2}
        r={DONUT_RADIUS}
        fill="none"
        stroke={overBudget ? 'url(#hatch)' : DONUT_PRIMARY}
        strokeWidth={DONUT_STROKE}
        strokeLinecap={clampedRatio >= 1 ? 'butt' : 'round'}
        strokeDasharray={DONUT_CIRCUMFERENCE}
        strokeDashoffset={mounted ? targetOffset : DONUT_CIRCUMFERENCE}
        style={{ transition: transitionStyle }}
      />
      {excessRatio > 0 ? (
        <circle
          cx={DONUT_SIZE / 2}
          cy={DONUT_SIZE / 2}
          r={DONUT_RADIUS}
          fill="none"
          stroke={DONUT_OVER}
          strokeWidth={DONUT_STROKE}
          strokeLinecap="butt"
          strokeDasharray={DONUT_CIRCUMFERENCE}
          strokeDashoffset={mounted ? excessOffset : DONUT_CIRCUMFERENCE}
          style={{ transition: transitionStyle }}
        />
      ) : null}
    </svg>
  )
}
