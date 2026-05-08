import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
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
import { formatDateId, formatNumberId } from '@/lib/format'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { MEAL_LOG_DAY_CARD_RADIUS_CLASS } from '@/lib/pageCard'
import { cn } from '@/lib/utils'
import { useFoodLogItems } from '@/hooks/useFoodLog'

export { MEAL_LOG_DAY_CARD_RADIUS_CLASS }

const WAKTU_LABELS = {
  pagi: 'Sarapan',
  siang: 'Makan siang',
  malam: 'Makan malam',
  snack: 'Snack',
}

/** Light yellow accent for generated meal-log rows / cells (Pantau log, klien dashboard). */
const MEAL_LOG_DAY_SURFACE = cn(
  'border-amber-200/55 bg-amber-50/95 text-card-foreground ring-1 ring-amber-200/35',
  'hover:border-amber-300/55 hover:bg-amber-50',
)
const MEAL_LOG_TABLE_ROW = cn(
  'border-amber-100/70 bg-amber-50/90 hover:bg-amber-50',
  'data-[state=selected]:bg-amber-100/60',
)

function formatLogTime(iso) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'HH:mm', { locale: localeId })
  } catch {
    return '—'
  }
}

function groupLogsByDateLists(logs) {
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
}

function dayTotal(logsForDay) {
  return (logsForDay ?? []).reduce((a, log) => a + (Number(log.total_kalori) || 0), 0)
}

function dayNutrients(logsForDay) {
  return (logsForDay ?? []).reduce(
    (a, log) => ({
      karbohidrat: a.karbohidrat + (Number(log.total_karbohidrat) || 0),
      protein: a.protein + (Number(log.total_protein) || 0),
      lemak: a.lemak + (Number(log.total_lemak) || 0),
      serat: a.serat + (Number(log.total_serat) || 0),
      natrium: a.natrium + (Number(log.total_natrium) || 0),
    }),
    { karbohidrat: 0, protein: 0, lemak: 0, serat: 0, natrium: 0 },
  )
}

function NutrientSummary({ nutrients }) {
  const { karbohidrat, protein, lemak, serat, natrium } = nutrients
  if (!karbohidrat && !protein && !lemak && !serat && !natrium) return null
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] leading-none text-muted-foreground/60">
      <span>K:{formatNumberId(karbohidrat, { maximumFractionDigits: 1 })}g</span>
      <span>P:{formatNumberId(protein, { maximumFractionDigits: 1 })}g</span>
      <span>L:{formatNumberId(lemak, { maximumFractionDigits: 1 })}g</span>
      <span>S:{formatNumberId(serat, { maximumFractionDigits: 1 })}g</span>
      <span>Na:{formatNumberId(natrium, { maximumFractionDigits: 0 })}mg</span>
    </div>
  )
}

export function FoodLogTable({ logs, pageSize = 10, embedded = false }) {
  const byDateLists = useMemo(() => groupLogsByDateLists(logs), [logs])
  const sortedDates = useMemo(
    () => [...byDateLists.keys()].sort((a, b) => b.localeCompare(a)),
    [byDateLists],
  )
  const [page, setPage] = useState(0)
  const start = page * pageSize
  const slice = sortedDates.slice(start, start + pageSize)

  const logIdsForPage = useMemo(() => {
    const ids = []
    for (const d of slice) {
      for (const log of byDateLists.get(d) ?? []) {
        ids.push(log.id)
      }
    }
    return ids
  }, [byDateLists, slice])

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
      <div className="space-y-3 md:hidden">
        {slice.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
            Belum ada log.
          </p>
        ) : (
          slice.map((tanggal) => {
              const logsForDay = byDateLists.get(tanggal) ?? []
              const total = dayTotal(logsForDay)
              const nutrients = dayNutrients(logsForDay)
              const dateLabel = formatDateId(tanggal)
              return (
                <button
                  key={tanggal}
                  type="button"
                  onClick={() => setModal(tanggal)}
                  aria-label={`Buka detail log makan ${dateLabel}`}
                  className={cn(
                    'group w-full cursor-pointer touch-manipulation select-none text-left outline-none transition-[transform,box-shadow,border-color] duration-200',
                    MEAL_LOG_DAY_CARD_RADIUS_CLASS,
                    'border p-3.5 shadow-sm',
                    MEAL_LOG_DAY_SURFACE,
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
                        <div className="text-base font-semibold tabular-nums text-primary">
                          {total > 0 ? <KaloriValue value={total} /> : '—'}
                        </div>
                        <NutrientSummary nutrients={nutrients} />
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                        aria-hidden
                      />
                    </div>
                  </div>
                <ul className="mt-3 space-y-2 border-t border-amber-200/40 pt-3">
                  {logsForDay.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs"
                    >
                      <span className="font-medium tabular-nums text-foreground">
                        <span className="text-muted-foreground">{formatLogTime(log.created_at)}</span>
                        <span className="mx-1.5 text-amber-700/50">·</span>
                        {WAKTU_LABELS[log.waktu_makan] ?? log.waktu_makan}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-foreground">
                        <KaloriValue value={log.total_kalori} />
                      </span>
                    </li>
                  ))}
                </ul>
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
                  <TableHead>Diary</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((tanggal) => {
                  const logsForDay = byDateLists.get(tanggal) ?? []
                  const total = dayTotal(logsForDay)
                  const nutrients = dayNutrients(logsForDay)
                  return (
                    <TableRow key={tanggal} className={MEAL_LOG_TABLE_ROW}>
                      <TableCell className="whitespace-nowrap align-top">
                        {formatDateId(tanggal)}
                      </TableCell>
                      <TableCell className="max-w-[min(28rem,42vw)] align-top text-sm">
                        <ul className="space-y-1.5 py-0.5">
                          {logsForDay.map((log) => (
                            <li key={log.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="tabular-nums text-muted-foreground">
                                {formatLogTime(log.created_at)}
                              </span>
                              <span className="text-foreground">
                                {WAKTU_LABELS[log.waktu_makan] ?? log.waktu_makan}
                              </span>
                              <span className="ml-auto shrink-0 font-medium tabular-nums">
                                <KaloriValue value={log.total_kalori} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums align-top">
                        {total > 0 ? (
                          <div>
                            <KaloriValue value={total} />
                            <NutrientSummary nutrients={nutrients} />
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="align-top">
                        <Button variant="outline" size="sm" onClick={() => setModal(tanggal)}>
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {slice.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Belum ada log.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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

      {modal && (
        <FoodLogDetailModal
          open={Boolean(modal)}
          onOpenChange={(o) => !o && setModal(null)}
          tanggal={modal}
          logsForDay={byDateLists.get(modal) ?? []}
          itemsByLogId={itemsByLogId}
        />
      )}
    </div>
  )
}
