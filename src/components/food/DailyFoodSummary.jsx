import { useMemo, useState } from 'react'
import { Sunrise, Sun, Moon, Cookie, Dumbbell, Trash2 } from 'lucide-react'
import { useFoodLogsForUser, useFoodLogItems, useDeleteFoodLog } from '@/hooks/useFoodLog'
import { useExerciseLogsForUser } from '@/hooks/useExerciseLog'
import { useAuth } from '@/hooks/useAuth'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDateId } from '@/lib/format'
import { cn } from '@/lib/utils'

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

const MEAL_DOT = {
  pagi: 'bg-emerald-500',
  siang: 'bg-orange-400',
  malam: 'bg-blue-500',
  snack: 'bg-rose-400',
}

const rowClass = 'flex items-center gap-2 py-1.5 text-sm'

export function DailyFoodSummary({ userId, tanggal }) {
  const { profile } = useAuth()
  const deleteMutation = useDeleteFoodLog()
  const [confirmLogId, setConfirmLogId] = useState(null)

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

  const showDelete = profile?.role === 'klien'

  const confirmLog = confirmLogId ? foodLogs.find((l) => l.id === confirmLogId) : null
  const confirmItems = confirmLog ? (itemsByLogId[confirmLog.id] ?? []) : []
  const confirmFoodName = confirmItems.map((i) => i.nama_makanan).join(', ') || '—'

  if (loadingFood || loadingExercise) return null
  if (!foodLogs.length && !exerciseLogs.length) return null

  return (
    <>
      <div className="border-t border-border/60 divide-y divide-border/40 px-4 py-3">
        {foodLogs.map((log) => {
          const Icon = MEAL_ICONS[log.waktu_makan] || Cookie
          const items = itemsByLogId[log.id] || []
          const itemNames = items.map((i) => i.nama_makanan).filter(Boolean)
          return (
            <div key={log.id} className={rowClass}>
              <span className={cn('h-2 w-2 shrink-0 rounded-full', MEAL_DOT[log.waktu_makan] || 'bg-muted-foreground')} />
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium shrink-0 min-w-[5rem]">
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
              {showDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmLogId(log.id)}
                  className="shrink-0 ml-1 p-1.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                  aria-label={`Hapus log ${MEAL_LABELS[log.waktu_makan] || log.waktu_makan}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        })}
        {exerciseLogs.map((log) => (
          <div key={log.id} className={rowClass}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400" />
            <Dumbbell className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium shrink-0 min-w-[5rem]">Olahraga</span>
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

      <Dialog open={Boolean(confirmLogId)} onOpenChange={(o) => { if (!o && !deleteMutation.isPending) setConfirmLogId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus entri log?</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 text-sm">
            <p className="text-muted-foreground">
              Entri berikut akan dihapus permanen:
            </p>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 space-y-0.5 text-xs">
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">Makanan:</span>
                <span className="font-medium text-foreground">{confirmFoodName}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">Waktu:</span>
                <span className="font-medium text-foreground">
                  {confirmLog ? (MEAL_LABELS[confirmLog.waktu_makan] || confirmLog.waktu_makan) : '—'}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground shrink-0">Tanggal:</span>
                <span className="font-medium text-foreground">{formatDateId(tanggal)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tindakan ini tidak bisa dibatalkan.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLogId(null)} disabled={deleteMutation.isPending}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !confirmLogId}
              onClick={() => {
                if (!confirmLogId || !userId) return
                deleteMutation.mutate(
                  {
                    logId: confirmLogId,
                    userId,
                    foodName: confirmFoodName,
                  },
                  {
                    onSuccess: () => {
                      setConfirmLogId(null)
                    },
                  },
                )
              }}
            >
              {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
