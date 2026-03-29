import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FoodLogDetailModal } from '@/components/food/FoodLogDetailModal'
import { formatDateId } from '@/lib/format'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { MEAL_LOG_DAY_CARD_RADIUS_CLASS } from '@/lib/pageCard'
import { cn } from '@/lib/utils'
import { useFoodLogItems } from '@/hooks/useFoodLog'

export { MEAL_LOG_DAY_CARD_RADIUS_CLASS }

const WAKTU_KEYS = ['pagi', 'siang', 'malam', 'snack']

const WAKTU_LABELS = {
  pagi: 'Pagi',
  siang: 'Siang',
  malam: 'Malam',
  snack: 'Snack',
}

function groupLogsByDate(logs) {
  const map = new Map()
  for (const log of logs ?? []) {
    const d = log.tanggal
    if (!map.has(d)) map.set(d, {})
    map.get(d)[log.waktu_makan] = log
  }
  return map
}

function dayStats(byDate, tanggal) {
  const m = byDate.get(tanggal) ?? {}
  const vals = WAKTU_KEYS.map((k) => (m[k] ? Number(m[k].total_kalori) : null))
  const total = vals.reduce((a, v) => a + (v ?? 0), 0)
  return { m, vals, total }
}

export function FoodLogTable({ logs, pageSize = 10, embedded = false }) {
  const byDate = useMemo(() => groupLogsByDate(logs), [logs])
  const sortedDates = useMemo(
    () => [...byDate.keys()].sort((a, b) => b.localeCompare(a)),
    [byDate],
  )
  const [page, setPage] = useState(0)
  const start = page * pageSize
  const slice = sortedDates.slice(start, start + pageSize)

  const logIdsForPage = useMemo(() => {
    const ids = []
    for (const d of slice) {
      const m = byDate.get(d)
      for (const k of WAKTU_KEYS) {
        if (m[k]) ids.push(m[k].id)
      }
    }
    return ids
  }, [byDate, slice])

  const { data: items = [] } = useFoodLogItems(logIdsForPage, logIdsForPage.length > 0)

  const itemsByLogId = useMemo(() => {
    const acc = {}
    for (const it of items) {
      if (!acc[it.food_log_id]) acc[it.food_log_id] = []
      acc[it.food_log_id].push(it)
    }
    return acc
  }, [items])

  const [modal, setModal] = useState(null)

  const totalPages = Math.max(1, Math.ceil(sortedDates.length / pageSize))

  return (
    <div className="space-y-3">
      <div className="space-y-2 md:hidden">
        {slice.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Belum ada log.</p>
        ) : (
          slice.map((tanggal) => {
            const { vals, total } = dayStats(byDate, tanggal)
            const dateLabel = formatDateId(tanggal)
            return (
              <button
                key={tanggal}
                type="button"
                onClick={() => setModal(tanggal)}
                aria-label={`Buka detail log makan ${dateLabel}`}
                className={cn(
                  'group w-full cursor-pointer touch-manipulation select-none text-left outline-none transition-[transform,box-shadow,border-color] duration-300 ease-out',
                  `${MEAL_LOG_DAY_CARD_RADIUS_CLASS} border border-primary/12 bg-gradient-to-br from-card via-secondary/35 to-muted/55`,
                  'p-2.5 shadow-[0_4px_24px_-8px_hsl(168_76%_36%_/_0.12)]',
                  'hover:border-primary/22 hover:shadow-[0_12px_40px_-12px_hsl(168_76%_36%_/_0.18)]',
                  'active:scale-[0.992]',
                  'focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  '',
                  '',
                  '',
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug tracking-tight text-foreground/88">
                    {dateLabel}
                  </span>
                  <div className="flex shrink-0 items-baseline justify-end gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/65">
                      Total
                    </span>
                    <span className="text-base font-semibold tabular-nums tracking-tight text-primary">
                      {total > 0 ? <KaloriValue value={total} /> : '—'}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {WAKTU_KEYS.map((k, i) => (
                    <div
                      key={k}
                      className={cn(
                        'min-w-0 rounded-2xl px-1 py-1.5 text-center',
                        'bg-background/55 ring-1 ring-border/35 ring-inset',
                        'transition-colors duration-300 group-hover:bg-background/75 group-hover:ring-border/45',
                        '',
                      )}
                    >
                      <div className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
                        {WAKTU_LABELS[k]}
                      </div>
                      <div className="mt-0.5 min-w-0 truncate text-xs font-semibold tabular-nums tracking-tight text-foreground/92">
                        {vals[i] != null ? <KaloriValue value={vals[i]} /> : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </button>
            )
          })
        )}
      </div>

      <Card
        className={cn(
          'hidden overflow-hidden md:block',
          embedded && 'border-0 bg-transparent shadow-none',
        )}
      >
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Pagi</TableHead>
                  <TableHead className="text-right">Siang</TableHead>
                  <TableHead className="text-right">Malam</TableHead>
                  <TableHead className="text-right">Snack</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((tanggal) => {
                  const { vals, total } = dayStats(byDate, tanggal)
                  return (
                    <TableRow key={tanggal}>
                      <TableCell>{formatDateId(tanggal)}</TableCell>
                      {vals.map((v, i) => (
                        <TableCell key={i} className="text-right tabular-nums">
                          {v != null ? <KaloriValue value={v} /> : '—'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium tabular-nums">
                        {total > 0 ? <KaloriValue value={total} /> : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setModal(tanggal)}>
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {slice.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Belum ada log.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Sebelumnya
        </Button>
        <span className="text-sm text-muted-foreground">
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

      {modal && (
        <FoodLogDetailModal
          open={Boolean(modal)}
          onOpenChange={(o) => !o && setModal(null)}
          tanggal={modal}
          logsByMeal={byDate.get(modal) ?? {}}
          itemsByLogId={itemsByLogId}
        />
      )}
    </div>
  )
}
