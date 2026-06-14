import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import { ChevronRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDateId, toIsoDateLocal } from '@/lib/format'
import { useExerciseLogsForUser, useDeleteExerciseLog } from '@/hooks/useExerciseLog'
import { useAuth } from '@/hooks/useAuth'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { cn } from '@/lib/utils'

export function ExerciseLogHistoryCard({ userId, tanggal, pageSize = 10, embedded = false }) {
  // Calculate default date range: two weeks back from today
  const defaultDateRange = useMemo(() => {
    if (tanggal) return null

    const today = new Date()
    const twoWeeksAgo = subDays(today, 14)
    return {
      from: toIsoDateLocal(twoWeeksAgo),
      to: toIsoDateLocal(today),
    }
  }, [tanggal])

  // Fetch logs - either for single date or date range
  const { data: logs = [], isLoading } = useExerciseLogsForUser(userId, {
    enabled: Boolean(userId),
    ...(tanggal
      ? { dateFrom: tanggal, dateTo: tanggal }
      : defaultDateRange
        ? { dateFrom: defaultDateRange.from, dateTo: defaultDateRange.to }
        : {}
    ),
  })

  const { profile } = useAuth()
  const deleteMutation = useDeleteExerciseLog()
  const [confirmLogId, setConfirmLogId] = useState(null)

  const confirmLog = confirmLogId ? (logs ?? []).find((l) => l.id === confirmLogId) : null

  // Group logs by date for mobile view
  const logsByDate = (() => {
    const map = new Map()
    for (const log of logs ?? []) {
      const d = log.tanggal
      if (!d) continue
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(log)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
    }
    return map
  })()

  const sortedDates = [...logsByDate.keys()].sort((a, b) => b.localeCompare(a))

  // Pagination state
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(sortedDates.length / pageSize))
  const start = page * pageSize
  const paginatedDates = sortedDates.slice(start, start + pageSize)

  // Calculate total calories per day
  function dayTotalCalories(logsForDay) {
    return (logsForDay ?? []).reduce((a, log) => a + (Number(log.kalori_estimasi) || 0), 0)
  }

  return (
    <div className="space-y-3">
      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {paginatedDates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
            Belum ada log.
          </p>
        ) : (
          paginatedDates.map((tanggal) => {
            const logsForDay = logsByDate.get(tanggal) ?? []
            const totalCalories = dayTotalCalories(logsForDay)
            const dateLabel = formatDateId(tanggal)
            return (
              <button
                key={tanggal}
                type="button"
                className={cn(
                  'group w-full cursor-pointer touch-manipulation select-none text-left outline-none transition-[transform,box-shadow,border-color] duration-200',
                  'rounded-2xl border p-3.5 shadow-sm',
                  'border-blue-200/55 bg-blue-50/95 text-card-foreground ring-1 ring-blue-200/35',
                  'hover:border-blue-300/55 hover:bg-blue-50',
                  'active:scale-[0.99]',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-snug tracking-tight text-foreground">
                    {dateLabel}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Total
                      </div>
                      <div className="text-base font-semibold tabular-nums text-blue-600">
                        {totalCalories > 0 ? <KaloriValue value={totalCalories} /> : '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {logsForDay.length} {logsForDay.length === 1 ? 'aktivitas' : 'aktivitas'}
                      </div>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                      aria-hidden
                    />
                  </div>
                </div>
                <ul className="mt-3 space-y-2 border-t border-blue-200/40 pt-3">
                  {logsForDay.map((log) => {
                    const showDelete = (profile?.role === 'klien' || profile?.role === 'ahli_gizi') && userId === profile?.id

                    return (
                      <li
                        key={log.id}
                        className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-medium text-foreground">
                            {log.jenis_olahraga || '—'}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {log.durasi || '—'}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-foreground">
                            {log.kalori_estimasi != null && log.kalori_estimasi > 0 ? (
                              <KaloriValue value={log.kalori_estimasi} />
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                        {showDelete && (
                          <button
                            type="button"
                            onClick={() => setConfirmLogId(log.id)}
                            className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                            aria-label={`Hapus ${log.jenis_olahraga}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </button>
            )
          })
        )}
      </div>

      {/* Desktop table view */}
      <div
        className={cn(
          'md:block',
          embedded && 'border-0 bg-transparent shadow-none',
        )}
      >
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          {isLoading ? (
            <div className="space-y-2.5 py-1">
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/70" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Belum ada log olahraga.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead className="text-right">Total Kalori</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDates.map((tanggal) => {
                    const logsForDay = logsByDate.get(tanggal) ?? []
                    const totalCalories = dayTotalCalories(logsForDay)
                    return (
                      <TableRow key={tanggal} className="border-blue-100/70 bg-blue-50/90 hover:bg-blue-50">
                        <TableCell className="whitespace-nowrap align-top">
                          {formatDateId(tanggal)}
                        </TableCell>
                        <TableCell className="max-w-[min(28rem,42vw)] align-top text-sm">
                          <ul className="space-y-1.5 py-0.5">
                            {logsForDay.map((log) => {
                              const showDelete = (profile?.role === 'klien' || profile?.role === 'ahli_gizi') && userId === profile?.id

                              return (
                                <li key={log.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <span className="font-medium text-foreground">
                                      {log.jenis_olahraga || '—'}
                                    </span>
                                    <span className="tabular-nums text-muted-foreground">
                                      {log.durasi || '—'}
                                    </span>
                                    <span className="font-medium tabular-nums">
                                      {log.kalori_estimasi != null && log.kalori_estimasi > 0 ? (
                                        <KaloriValue value={log.kalori_estimasi} />
                                      ) : (
                                        '—'
                                      )}
                                    </span>
                                  </div>
                                  {showDelete && (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmLogId(log.id)}
                                      className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                                      aria-label={`Hapus ${log.jenis_olahraga}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums align-top">
                          {totalCalories > 0 ? (
                            <div>
                              <KaloriValue value={totalCalories} />
                              <div className="text-[10px] text-muted-foreground">
                                {logsForDay.length} {logsForDay.length === 1 ? 'aktivitas' : 'aktivitas'}
                              </div>
                            </div>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          'rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04]',
          'md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:ring-0',
        )}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Sebelumnya
        </Button>
        <span className="text-sm font-medium text-foreground tabular-nums md:font-normal md:text-muted-foreground">
          Halaman {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        >
          Berikutnya
        </Button>
      </div>

      {confirmLog && (
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
                  <span className="text-muted-foreground shrink-0">Aktivitas:</span>
                  <span className="font-medium text-foreground">{confirmLog.jenis_olahraga || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">Durasi:</span>
                  <span className="font-medium text-foreground">{confirmLog.durasi || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">Tanggal:</span>
                  <span className="font-medium text-foreground">{formatDateId(confirmLog.tanggal)}</span>
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
                      jenisOlahraga: confirmLog.jenis_olahraga || '—',
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
      )}
    </div>
  )
}
