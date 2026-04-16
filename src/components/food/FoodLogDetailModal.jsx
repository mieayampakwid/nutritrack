import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { XIcon } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Dialog, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
        <DialogOverlay className="data-[state=open]:duration-[420ms] data-[state=closed]:duration-[240ms]" />
        <MotionDialogContent
          layout
          transition={{ layout: DIALOG_LAYOUT }}
          className={cn(
            'fixed top-[50%] left-[50%] z-50 flex w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-3 overflow-x-hidden overflow-y-auto p-4 text-popover-foreground shadow-2xl sm:max-w-lg sm:p-5',
            'max-h-[90dvh] rounded-2xl border border-border bg-popover',
            'duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
            'data-[state=closed]:duration-[240ms]',
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

          <div className="flex max-h-[min(62dvh,480px)] flex-col gap-3 overflow-y-auto pr-0.5">
            {!logsForDay?.length ? (
              <div className="flex min-h-[5.5rem] items-center justify-center rounded-xl border border-border/80 bg-card px-4 py-8 shadow-sm">
                <p className="text-center text-sm text-muted-foreground">Tidak ada entri.</p>
              </div>
            ) : (
              logsForDay.map((log) => {
                const items = itemsByLogId[log.id] ?? []
                return (
                  <section
                    key={log.id}
                    className="overflow-hidden rounded-xl border border-amber-200/50 bg-amber-50/40 shadow-sm ring-1 ring-amber-200/25"
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
                      <div className="max-h-56 overflow-y-auto overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-amber-200/50 bg-amber-50/70 hover:bg-amber-50/80">
                              <TableHead>Jam</TableHead>
                              <TableHead>Makanan</TableHead>
                              <TableHead className="text-center">Jml</TableHead>
                              <TableHead className="text-center">Satuan</TableHead>
                              <TableHead className="text-center">Kkal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((it) => (
                              <TableRow
                                key={it.id}
                                className="border-amber-100/60 bg-amber-50/85 hover:bg-amber-50 data-[state=selected]:bg-amber-100/50"
                              >
                                <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                                  {formatLogTime(it.created_at ?? log.created_at)}
                                </TableCell>
                                <TableCell className="max-w-[36%]">{it.nama_makanan}</TableCell>
                                <TableCell className="text-center tabular-nums">
                                  {formatNumberId(it.jumlah)}
                                </TableCell>
                                <TableCell className="text-center text-sm">{it.unit_nama}</TableCell>
                                <TableCell className="text-center tabular-nums font-medium">
                                  {formatNumberId(it.kalori_estimasi)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </section>
                )
              })
            )}
          </div>

          <CalorieDisclaimer className="shrink-0 border-t border-border/50 pt-3" />

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
