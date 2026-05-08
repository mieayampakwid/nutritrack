import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import { ChevronRight, Utensils, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateId, formatNumberId, toIsoDateLocal } from '@/lib/format'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { cn } from '@/lib/utils'

const THEMES = {
  food: {
    icon: Utensils,
    color: 'border-amber-200/55 bg-amber-50/95 text-card-foreground ring-1 ring-amber-200/35',
    hoverColor: 'hover:border-amber-300/55 hover:bg-amber-50',
    rowColor: 'border-amber-100/70 bg-amber-50/90 hover:bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200/40',
  },
  exercise: {
    icon: Dumbbell,
    color: 'border-blue-200/55 bg-blue-50/95 text-card-foreground ring-1 ring-blue-200/35',
    hoverColor: 'hover:border-blue-300/55 hover:bg-blue-50',
    rowColor: 'border-blue-100/70 bg-blue-50/90 hover:bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200/40',
  },
}

const WAKTU_LABELS = {
  pagi: 'Sarapan',
  siang: 'Makan siang',
  malam: 'Makan malam',
  snack: 'Snack',
}

function formatLogTime(iso) {
  if (!iso) return '—'
  try {
    const date = new Date(iso)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return '—'
  }
}

export function ActivityLogTable({
  type = 'food',
  data,
  pageSize = 10,
  embedded = false,
  tanggal,
}) {
  const theme = THEMES[type]
  const Icon = theme.icon

  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return []

    if (tanggal) {
      return data.filter(item => item.tanggal === tanggal)
    }

    const today = new Date()
    const twoWeeksAgo = subDays(today, 14)
    const minTanggal = toIsoDateLocal(twoWeeksAgo)

    return data.filter(item => {
      if (!item.tanggal) return false
      return item.tanggal >= minTanggal
    })
  }, [data, tanggal])

  // Group by date
  const dataByDate = useMemo(() => {
    const map = new Map()
    for (const item of filteredData) {
      const d = item.tanggal
      if (!d) continue
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(item)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
    }
    return map
  }, [filteredData])

  const sortedDates = useMemo(
    () => [...dataByDate.keys()].sort((a, b) => b.localeCompare(a)),
    [dataByDate],
  )

  // Pagination
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(sortedDates.length / pageSize))
  const start = page * pageSize
  const paginatedDates = sortedDates.slice(start, start + pageSize)

  // Calculate totals
  function dayTotal(dataForDay) {
    if (type === 'food') {
      return dataForDay.reduce((a, log) => a + (Number(log.total_kalori) || 0), 0)
    } else {
      return dataForDay.reduce((a, log) => a + (Number(log.kalori_estimasi) || 0), 0)
    }
  }

  function dayNutrients(dataForDay) {
    return dataForDay.reduce(
      (a, log) => ({
        karbohidrat: a.karbohidrat + (Number(log.total_karbohidrat) || 0),
        protein: a.protein + (Number(log.total_protein) || 0),
        lemak: a.lemak + (Number(log.total_lemak) || 0),
      }),
      { karbohidrat: 0, protein: 0, lemak: 0 },
    )
  }

  function NutrientSummary({ nutrients }) {
    if (type !== 'food') return null
    const { karbohidrat, protein, lemak } = nutrients
    if (!karbohidrat && !protein && !lemak) return null
    return (
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] leading-none text-muted-foreground/60">
        <span>K:{formatNumberId(karbohidrat, { maximumFractionDigits: 1 })}g</span>
        <span>P:{formatNumberId(protein, { maximumFractionDigits: 1 })}g</span>
        <span>L:{formatNumberId(lemak, { maximumFractionDigits: 1 })}g</span>
      </div>
    )
  }

  // Render mobile card item
  function renderMobileItem(item) {
    if (type === 'food') {
      return (
        <li className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
          <span className="tabular-nums text-muted-foreground">
            {formatLogTime(item.created_at)}
          </span>
          <span className="text-foreground">
            {WAKTU_LABELS[item.waktu_makan] ?? item.waktu_makan}
          </span>
          <span className="ml-auto shrink-0 font-semibold tabular-nums text-foreground">
            <KaloriValue value={item.total_kalori} />
          </span>
        </li>
      )
    } else {
      return (
        <li className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
          <span className="font-medium text-foreground">
            {item.jenis_olahraga || '—'}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {item.durasi || '—'}
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-foreground">
            {item.kalori_estimasi != null && item.kalori_estimasi > 0 ? (
              <KaloriValue value={item.kalori_estimasi} />
            ) : (
              '—'
            )}
          </span>
        </li>
      )
    }
  }

  // Render table row item
  function renderTableRowItem(item) {
    if (type === 'food') {
      return (
        <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="tabular-nums text-muted-foreground">
            {formatLogTime(item.created_at)}
          </span>
          <span className="text-foreground">
            {WAKTU_LABELS[item.waktu_makan] ?? item.waktu_makan}
          </span>
          <span className="ml-auto shrink-0 font-medium tabular-nums">
            <KaloriValue value={item.total_kalori} />
          </span>
        </li>
      )
    } else {
      return (
        <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium text-foreground">
            {item.jenis_olahraga || '—'}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {item.durasi || '—'}
          </span>
          <span className="ml-auto shrink-0 font-medium tabular-nums">
            {item.kalori_estimasi != null && item.kalori_estimasi > 0 ? (
              <KaloriValue value={item.kalori_estimasi} />
            ) : (
              '—'
            )}
          </span>
        </li>
      )
    }
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
          paginatedDates.map((date) => {
            const dataForDay = dataByDate.get(date) ?? []
            const total = dayTotal(dataForDay)
            const nutrients = dayNutrients(dataForDay)
            const dateLabel = formatDateId(date)
            return (
              <button
                key={date}
                type="button"
                className={cn(
                  'group w-full cursor-pointer touch-manipulation select-none text-left outline-none transition-[transform,box-shadow,border-color] duration-200',
                  'rounded-2xl border p-3.5 shadow-sm',
                  theme.color,
                  theme.hoverColor,
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
                      <div className={cn('text-base font-semibold tabular-nums', theme.textColor)}>
                        {total > 0 ? <KaloriValue value={total} /> : '—'}
                      </div>
                      {type === 'food' && <NutrientSummary nutrients={nutrients} />}
                      {type === 'exercise' && (
                        <div className="text-[10px] text-muted-foreground">
                          {dataForDay.length} {dataForDay.length === 1 ? 'aktivitas' : 'aktivitas'}
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                      aria-hidden
                    />
                  </div>
                </div>
                <ul className="mt-3 space-y-2 border-t opacity-30 pt-3">
                  {dataForDay.map((item) => (
                    <li key={item.id}>{renderMobileItem(item)}</li>
                  ))}
                </ul>
              </button>
            )
          })
        )}
      </div>

      {/* Desktop table view */}
      <div
        className={cn(
          'hidden overflow-x-auto rounded-xl border border-border/70 bg-card p-4 shadow-sm md:block',
          embedded && 'border-0 bg-transparent shadow-none',
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>{type === 'food' ? 'Log Makan' : 'Aktivitas'}</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDates.map((date) => {
              const dataForDay = dataByDate.get(date) ?? []
              const total = dayTotal(dataForDay)
              const nutrients = dayNutrients(dataForDay)
              return (
                <TableRow key={date} className={theme.rowColor}>
                  <TableCell className="whitespace-nowrap align-top">
                    {formatDateId(date)}
                  </TableCell>
                  <TableCell className="max-w-[min(28rem,42vw)] align-top text-sm">
                    <ul className="space-y-1.5 py-0.5">
                      {dataForDay.map((item) => (
                        <li key={item.id}>{renderTableRowItem(item)}</li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums align-top">
                    {total > 0 ? (
                      <div>
                        <KaloriValue value={total} />
                        {type === 'food' && <NutrientSummary nutrients={nutrients} />}
                        {type === 'exercise' && (
                          <div className="text-[10px] text-muted-foreground">
                            {dataForDay.length} {dataForDay.length === 1 ? 'aktivitas' : 'aktivitas'}
                          </div>
                        )}
                      </div>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
            {paginatedDates.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Belum ada log.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
    </div>
  )
}
