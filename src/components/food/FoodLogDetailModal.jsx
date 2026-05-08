import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { XIcon } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Dialog, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { CalorieDisclaimer } from '@/components/shared/CalorieDisclaimer'
import { formatDateId, formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

const WAKTU_LABELS = {
  pagi: 'Sarapan',
  siang: 'Makan siang',
  malam: 'Makan malam',
  snack: 'Snack',
}

const DIALOG_LAYOUT = {
  type: 'spring',
  stiffness: 200,
  damping: 46,
  mass: 0.92,
  restSpeed: 0.5,
  restDelta: 0.01,
}

const MotionDialogContent = motion(DialogPrimitive.Content)

function formatLogTime(iso) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'HH:mm', { locale: localeId })
  } catch {
    return '—'
  }
}

export function FoodLogDetailModal({ open, onOpenChange, tanggal, logsForDay, itemsByLogId }) {
  const totalHari = (logsForDay ?? []).reduce((a, log) => a + (Number(log.total_kalori) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="data-[state=open]:duration-420 data-[state=closed]:duration-240" />
        <MotionDialogContent
          layout
          transition={{ layout: DIALOG_LAYOUT }}
          className={cn(
            'fixed left-[50%] top-4 bottom-4 z-50 flex w-full max-w-[calc(100%-2rem)] translate-x-[-50%] flex-col gap-3 overflow-hidden p-4 text-popover-foreground shadow-2xl sm:top-6 sm:bottom-6 sm:max-w-lg sm:p-5',
            'rounded-2xl border border-border bg-popover',
            'duration-420 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'data-[state=closed]:duration-240',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-[0.98]',
            'data-[state=open]:slide-in-from-bottom-3 data-[state=closed]:slide-out-to-bottom-3',
          )}
        >
          <DialogHeader className="shrink-0 space-y-1 text-left">
            <DialogTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-8 text-base leading-snug sm:text-lg">
              <span>{formatDateId(tanggal)}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-muted-foreground">Total</span>
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-lg font-semibold tabular-nums text-foreground sm:text-xl">
                  {formatNumberId(totalHari)}
                </span>
                <span className="text-sm font-semibold text-muted-foreground sm:text-base">kkal</span>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
            {!logsForDay?.length ? (
              <div className="flex min-h-22 items-center justify-center rounded-xl border border-border/80 bg-card px-4 py-8 shadow-sm">
                <p className="text-center text-sm text-muted-foreground">Tidak ada entri.</p>
              </div>
            ) : (
              logsForDay.map((log) => {
                const items = itemsByLogId[log.id] ?? []
                return (
                  <section
                    key={log.id}
                    className="rounded-xl border border-amber-200/50 bg-amber-50/40 shadow-sm ring-1 ring-amber-200/25"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/40 bg-amber-50/70 px-3 py-2 text-sm">
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatLogTime(log.created_at)}
                        <span className="mx-2 font-normal text-muted-foreground">·</span>
                        {WAKTU_LABELS[log.waktu_makan] ?? log.waktu_makan}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-primary">
                        {formatNumberId(log.total_kalori)} kkal
                      </span>
                    </header>
                    {items.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground">Tidak ada item.</p>
                    ) : (
                      <div className="px-3 pb-3 pt-2">
                        <div className="hidden grid-cols-12 gap-x-3 gap-y-1 text-[0.8125rem] font-semibold text-muted-foreground sm:grid">
                          <div className="col-span-2">Jam</div>
                          <div className="col-span-6">Makanan</div>
                          <div className="col-span-1 text-right">Jml</div>
                          <div className="col-span-2 text-right">Satuan</div>
                          <div className="col-span-1 text-right">Kkal</div>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {items.map((it) => (
                            <div key={it.id} className="rounded-lg bg-amber-50/85 ring-1 ring-amber-100/60">
                              {/* Mobile: stacked, no column overlap */}
                              <div className="px-2.5 py-2 sm:hidden">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="line-clamp-2 wrap-break-word font-medium text-foreground">
                                      {it.nama_makanan}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                      <span className="whitespace-nowrap tabular-nums">
                                        {formatLogTime(it.created_at ?? log.created_at)}
                                      </span>
                                      <span className="text-muted-foreground/60">•</span>
                                      <span className="whitespace-nowrap tabular-nums">{formatNumberId(it.jumlah)}</span>
                                      <span className="truncate">{it.unit_nama}</span>
                                    </div>
                                    <div className="mt-1.5 text-[10px] leading-none text-muted-foreground/70">
                                      P:{formatNumberId(it.protein, { maximumFractionDigits: 1 })}g · K:{formatNumberId(it.karbohidrat, { maximumFractionDigits: 1 })}g · L:{formatNumberId(it.lemak, { maximumFractionDigits: 1 })}g · S:{formatNumberId(it.serat, { maximumFractionDigits: 1 })}g · Na:{formatNumberId(it.natrium, { maximumFractionDigits: 0 })}mg
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <div className="text-sm font-semibold tabular-nums text-foreground">
                                      {formatNumberId(it.kalori_estimasi)}
                                    </div>
                                    <div className="text-[0.75rem] font-semibold text-muted-foreground">kkal</div>
                                  </div>
                                </div>
                              </div>

                              {/* Desktop: stable grid columns */}
                              <div className="hidden grid-cols-12 items-start gap-x-3 px-2.5 py-2 text-sm sm:grid">
                                <div className="col-span-2 whitespace-nowrap tabular-nums text-muted-foreground">
                                  {formatLogTime(it.created_at ?? log.created_at)}
                                </div>
                                <div className="col-span-6 font-medium text-foreground">
                                  <div className="line-clamp-2 wrap-break-word">{it.nama_makanan}</div>
                                </div>
                                <div className="col-span-1 text-right tabular-nums">{formatNumberId(it.jumlah)}</div>
                                <div className="col-span-2 text-right text-sm text-muted-foreground">{it.unit_nama}</div>
                                <div className="col-span-1 text-right tabular-nums font-semibold text-foreground">
                                  {formatNumberId(it.kalori_estimasi)}
                                </div>
                              </div>
                              <div className="hidden grid-cols-12 px-2.5 pb-2 text-[10px] text-muted-foreground/70 sm:grid">
                                <div className="col-span-2" />
                                <div className="col-span-10">
                                  P:{formatNumberId(it.protein, { maximumFractionDigits: 1 })}g · K:{formatNumberId(it.karbohidrat, { maximumFractionDigits: 1 })}g · L:{formatNumberId(it.lemak, { maximumFractionDigits: 1 })}g · S:{formatNumberId(it.serat, { maximumFractionDigits: 1 })}g · Na:{formatNumberId(it.natrium, { maximumFractionDigits: 0 })}mg
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )
              })
            )}

            <CalorieDisclaimer className="mt-1 rounded-xl border border-border/50 bg-card/40 p-4" />
          </div>

          <DialogPrimitive.Close
            className="absolute top-3 right-3 rounded-full opacity-70 ring-offset-background transition-all duration-200 hover:scale-110 hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Tutup</span>
          </DialogPrimitive.Close>
        </MotionDialogContent>
      </DialogPortal>
    </Dialog>
  )
}
