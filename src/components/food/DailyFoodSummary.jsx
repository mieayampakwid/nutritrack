import { useMemo } from 'react'
import { Sunrise, Sun, Moon, Cookie, Dumbbell } from 'lucide-react'
import { useFoodLogsForUser, useFoodLogItems } from '@/hooks/useFoodLog'
import { useExerciseLogsForUser } from '@/hooks/useExerciseLog'
import { KaloriValue } from '@/components/shared/KaloriValue'

const MEAL_ICONS = {
  pagi: Sunrise,
  siang: Sun,
  malam: Moon,
  snack: Cookie,
}

const MEAL_LABELS = {
  pagi: 'Sarapan',
  siang: 'Makan siang',
  malam: 'Makan malam',
  snack: 'Snack',
}

const MEAL_COLORS = {
  pagi: 'border-l-emerald-500 bg-emerald-50/60',
  siang: 'border-l-orange-400 bg-orange-50/60',
  malam: 'border-l-blue-500 bg-blue-50/60',
  snack: 'border-l-rose-400 bg-rose-50/60',
}

export function DailyFoodSummary({ userId, tanggal }) {
  const { data: foodLogs = [], isLoading: loadingFood } = useFoodLogsForUser(userId, {
    dateFrom: tanggal,
    dateTo: tanggal,
  }, Boolean(userId && tanggal))

  const logIds = useMemo(() => foodLogs.map((l) => l.id), [foodLogs])
  const { data: foodItems = [] } = useFoodLogItems(logIds, logIds.length > 0)

  const { data: exerciseLogs = [], isLoading: loadingExercise } = useExerciseLogsForUser(userId, {
    dateFrom: tanggal,
    dateTo: tanggal,
  }, Boolean(userId && tanggal))

  const itemsByLogId = useMemo(() => {
    const map = {}
    for (const item of foodItems) {
      if (!map[item.food_log_id]) map[item.food_log_id] = []
      map[item.food_log_id].push(item)
    }
    return map
  }, [foodItems])

  if (loadingFood || loadingExercise) return null
  if (!foodLogs.length && !exerciseLogs.length) return null

  return (
    <div className="space-y-1.5">
      {foodLogs.map((log) => {
        const Icon = MEAL_ICONS[log.waktu_makan] || Cookie
        const items = itemsByLogId[log.id] || []
        const itemNames = items.map((i) => i.nama_makanan).filter(Boolean)
        return (
          <div
            key={log.id}
            className={`flex items-center gap-2.5 rounded-xl border-l-4 bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur-sm ${MEAL_COLORS[log.waktu_makan] || 'border-l-muted'}`}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              {MEAL_LABELS[log.waktu_makan] || log.waktu_makan}
            </span>
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {itemNames.join(', ') || '—'}
            </span>
            <KaloriValue
              value={log.total_kalori}
              className="text-xs font-semibold tabular-nums whitespace-nowrap"
              unitClassName="text-[0.7em] font-normal text-muted-foreground"
            />
          </div>
        )
      })}
      {exerciseLogs.map((log) => (
        <div
          key={log.id}
          className="flex items-center gap-2.5 rounded-xl border-l-4 border-l-orange-500 bg-orange-50/60 px-3 py-2 text-sm shadow-sm backdrop-blur-sm"
        >
          <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground shrink-0">Olahraga</span>
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {log.jenis_olahraga} · {log.durasi}
          </span>
          <KaloriValue
            value={log.kalori_estimasi}
            className="text-xs font-semibold tabular-nums whitespace-nowrap"
            unitClassName="text-[0.7em] font-normal text-muted-foreground"
          />
        </div>
      ))}
    </div>
  )
}
