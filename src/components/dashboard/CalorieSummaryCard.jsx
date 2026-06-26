import { useEffect, useMemo, useRef, useState } from 'react'
import { FlagBanner, Hamburger, PersonSimpleRun, CheckCircle, Circle, Fire } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { useExerciseLogsForUser } from '@/hooks/useExerciseLog'
import { formatNumberId, toIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { deriveLogDates } from './logDates'

const DONUT_SIZE = 120
const DONUT_STROKE = 15
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

const DONUT_TRACK = 'hsl(210 12% 90%)'
const DONUT_PRIMARY = 'var(--color-primary)'
const DONUT_OVER = 'hsl(5 72% 52%)'

function sumField(list, field) {
  return (list ?? []).reduce((s, row) => s + (Number(row[field]) || 0), 0)
}

export function CalorieSummaryCard({ userId, className, slot }) {
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

  const { data: logDates = { loggedDates: [], streakDates: [] }, isLoading: weekLoading } = useQuery({
    queryKey: ['food_log_dates', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('tanggal, created_at')
        .eq('user_id', userId)
        .order('tanggal', { ascending: false })
      if (error) throw error
      return deriveLogDates(data)
    },
    staleTime: 5 * 60 * 1000,
  })

  const { loggedDates, streakDates } = logDates

  const weekDays = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
    const days = []
    const labels = ['S', 'S', 'R', 'K', 'J', 'S', 'M']
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const iso = toIsoDateLocal(d)
      days.push({ iso, label: labels[i], checked: loggedDates.includes(iso) })
    }
    return days
  }, [loggedDates])

  const currentStreak = useMemo(() => {
    if (!streakDates.length) return 0
    const sorted = [...streakDates].sort((a, b) => b.localeCompare(a))
    const latest = sorted[0]
    const today = toIsoDateLocal(new Date())
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const yesterday = toIsoDateLocal(y)
    if (latest !== today && latest !== yesterday) return 0
    let streak = 1
    const d = new Date(latest)
    while (true) {
      d.setDate(d.getDate() - 1)
      const iso = toIsoDateLocal(d)
      if (streakDates.includes(iso)) streak++
      else break
    }
    return streak
  }, [streakDates])

  const targetKcal = latestAssessment?.anjuran_kalori_harian ?? latestAssessment?.energi_total
  const consumedKcal = useMemo(() => sumField(foodLogs, 'total_kalori'), [foodLogs])
  const burnedKcal = useMemo(() => sumField(exerciseLogs, 'kalori_estimasi'), [exerciseLogs])

  const hasTarget = targetKcal != null && Number(targetKcal) > 0
  const [streakInfo, setStreakInfo] = useState(false)
  const streakRef = useRef(null)

  useEffect(() => {
    if (!streakInfo) return
    const close = (e) => {
      if (streakRef.current && !streakRef.current.contains(e.target)) {
        setStreakInfo(false)
      }
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [streakInfo])
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
        <>
        <div className="mx-auto flex w-fit items-center gap-5 px-5 py-3">
          <div className="relative h-[120px] w-[120px] shrink-0">
            <Donut ratio={donutRatio} overBudget={overBudget} excessRatio={excessRatio} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
                {overBudget ? 'Over' : 'Sisa'}
              </span>
              <span
                className={cn(
                  'text-xl font-bold tabular-nums leading-none',
                  overBudget ? 'text-amber-600' : 'text-foreground',
                )}
              >
                {formatNumberId(overBudget ? Math.abs(remaining) : remaining)}
              </span>
              <span className="text-[0.625rem] font-medium text-muted-foreground">
                kkal
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2.5 text-sm">
            <div className="flex items-center gap-3">
              <FlagBanner className="h-8 w-8 shrink-0 text-teal-600" weight="fill" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Target Kalori</p>
                <p className="text-base font-semibold tabular-nums text-foreground">
                  {formatNumberId(targetKcal)} <span className="text-xs font-normal text-muted-foreground">kkal</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Hamburger className="h-8 w-8 shrink-0 text-amber-600" weight="fill" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Makanan</p>
                <p className="text-base font-semibold tabular-nums text-foreground">
                  {formatNumberId(consumedKcal)} <span className="text-xs font-normal text-muted-foreground">kkal</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PersonSimpleRun className="h-8 w-8 shrink-0 text-blue-600" weight="fill" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Olahraga</p>
                <p className="text-base font-semibold tabular-nums text-foreground">
                  {formatNumberId(burnedKcal)} <span className="text-xs font-normal text-muted-foreground">kkal</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        {slot}
        <div className="border-t border-border/40 px-5 py-3">
          {weekLoading ? (
            <div className="mx-auto h-6 w-48 animate-pulse rounded bg-muted/50" />
          ) : (
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5">
                {weekDays.map((d) => (
                  <div key={d.iso} className="flex flex-col items-center gap-0.5">
                    <span className="text-[0.625rem] text-muted-foreground">{d.label}</span>
                    {d.checked ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" weight="fill" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/25" weight="fill" />
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="relative flex items-center gap-2 cursor-help"
                onClick={(e) => { e.stopPropagation(); setStreakInfo((v) => !v) }}
                aria-label="Info streak"
                ref={streakRef}
              >
                <Fire className="h-7 w-7 text-orange-500" weight="fill" />
                <span className="text-base text-muted-foreground">
                  {currentStreak > 0 ? (
                    <><span className="font-semibold tabular-nums text-foreground">{currentStreak}</span> hari</>
                  ) : (
                    'Siap?'
                  )}
                </span>
                {streakInfo ? (
                  <div className="absolute -top-2 right-0 w-52 max-w-[80vw] translate-y-[-100%] rounded-xl border border-border bg-popover px-3 py-2 text-left text-xs text-muted-foreground shadow-lg ring-1 ring-black/5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200">
                    <p>Streak dihitung dari jumlah hari kamu mencatat makanan secara berurutan, tanpa jeda.</p>
                    <p className="mt-1 text-muted-foreground/70">Hanya entri yang dicatat di hari yang sama yang dihitung — entri mundur (backdate) tidak termasuk.</p>
                    <a
                      href="/klien/food-entry"
                      className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-600"
                    >
                      Lanjut streak?
                    </a>
                  </div>
                ) : null}
              </button>
            </div>
          )}
        </div>
        </>
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
