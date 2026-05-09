import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { XIcon } from 'lucide-react'
import { Dialog, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { CalorieDisclaimer } from '@/components/shared/CalorieDisclaimer'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { NutrientLine } from '@/components/shared/NutrientLine'
import { formatDateId } from '@/lib/format'
import {
  MEAL_ORDER,
  MEAL_CARD_COLORS,
  WAKTU_LABELS,
  groupTotal,
  groupNutrients,
} from '@/lib/foodLogUtils'
import { cn } from '@/lib/utils'

const DIALOG_LAYOUT = {
  type: 'spring',
  stiffness: 200,
  damping: 46,
  mass: 0.92,
  restSpeed: 0.5,
  restDelta: 0.01,
}

const MotionDialogContent = motion(DialogPrimitive.Content)

export function FoodLogMealDetailDialog({ open, onOpenChange, tanggal, logsForDay, itemsByLogId }) {
  const dayTotal = groupTotal(logsForDay)
  const dayNutrients = groupNutrients(logsForDay)

  const groups = {}
  for (const key of MEAL_ORDER) {
    groups[key] = []
  }
  for (const log of logsForDay ?? []) {
    const key = log.waktu_makan
    if (key && groups[key]) {
      groups[key].push(log)
    }
  }

  const hasAnyLogs = MEAL_ORDER.some((key) => groups[key].length > 0)

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
                  <KaloriValue value={dayTotal} />
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
            {!hasAnyLogs ? (
              <div className="flex min-h-22 items-center justify-center rounded-xl border border-border/80 bg-card px-4 py-8 shadow-sm">
                <p className="text-center text-sm text-muted-foreground">Tidak ada entri.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {MEAL_ORDER.map((key) => {
                  const groupLogs = groups[key]
                  const groupKalori = groupTotal(groupLogs)
                  const nutrients = groupNutrients(groupLogs)
                  const label = WAKTU_LABELS[key] || key
                  const colors = MEAL_CARD_COLORS[key] || MEAL_CARD_COLORS.pagi

                  return (
                    <div
                      key={key}
                      className={cn(
                        'rounded-xl border shadow-sm ring-1',
                        colors.border,
                        colors.bg,
                        colors.ring,
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center justify-between border-b px-3 py-2 text-sm',
                          colors.borderDivider,
                          colors.header,
                        )}
                      >
                        <div className="min-w-0">
                          <span className={cn('font-semibold', colors.text)}>{label}</span>
                          {groupLogs.length > 0 && (
                            <NutrientLine nutrients={nutrients} className="mt-0.5" />
                          )}
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums text-primary">
                          <KaloriValue value={groupKalori} />
                        </span>
                      </div>
                      <div className="space-y-1.5 px-3 py-2">
                        {groupLogs.length === 0 ? (
                          <div className="px-2.5 py-1.5 text-sm text-muted-foreground italic">
                            Belum ada.
                          </div>
                        ) : (
                          groupLogs.map((log, idx) => {
                            const items = itemsByLogId[log.id] ?? []

                            return (
                              <div key={log.id} className="space-y-1">
                                <div className="rounded-lg px-2.5 py-1.5 text-sm ring-1 bg-white/50 ring-black/5">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-muted-foreground tabular-nums">#{idx + 1}</span>
                                    <span className="shrink-0 font-medium tabular-nums text-foreground">
                                      <KaloriValue value={log.total_kalori} />
                                    </span>
                                  </div>
                                </div>
                                {items.length > 0 && (
                                  <ul className="ml-6 space-y-0.5 text-xs">
                                    {items.map((item) => (
                                      <li key={item.id} className="flex items-start gap-2 text-muted-foreground">
                                        <span>•</span>
                                        <span className="flex-1 flex items-start justify-between gap-2">
                                          <span>
                                            <span className="font-medium text-foreground">{item.nama_makanan}</span>
                                            <span className="mx-1">×</span>
                                            <span className="tabular-nums">{item.jumlah}</span>
                                            <span className="ml-1">{item.unit_nama}</span>
                                          </span>
                                          <span className="shrink-0 font-medium tabular-nums text-foreground">
                                            <KaloriValue value={item.kalori_estimasi} />
                                          </span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
                <div className="rounded-lg border border-teal-200/50 bg-teal-50/30 px-3 py-2 text-sm ring-1 ring-teal-200/25">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground">Total hari ini</span>
                      <NutrientLine nutrients={dayNutrients} className="mt-0.5" />
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-primary">
                      <KaloriValue value={dayTotal} />
                    </span>
                  </div>
                </div>
              </div>
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
