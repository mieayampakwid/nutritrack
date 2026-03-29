import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { XIcon } from 'lucide-react'
import { Dialog, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const WAKTU = [
  { key: 'pagi', label: 'Pagi' },
  { key: 'siang', label: 'Siang' },
  { key: 'malam', label: 'Malam' },
  { key: 'snack', label: 'Snack' },
]

const TAB_SPRING = { type: 'spring', stiffness: 450, damping: 34, mass: 0.85 }

/** Smooth stretch on the dialog shell when tab / content height changes */
const DIALOG_LAYOUT = {
  type: 'spring',
  stiffness: 200,
  damping: 46,
  mass: 0.92,
  restSpeed: 0.5,
  restDelta: 0.01,
}

const MotionDialogContent = motion(DialogPrimitive.Content)

export function FoodLogDetailModal({ open, onOpenChange, tanggal, logsByMeal, itemsByLogId }) {
  const [tab, setTab] = useState('pagi')

  useEffect(() => {
    if (open) setTab('pagi')
  }, [open, tanggal])

  const totalHari = WAKTU.reduce((acc, { key }) => {
    const log = logsByMeal[key]
    return acc + (log ? Number(log.total_kalori) : 0)
  }, 0)

  function renderTabBody(key) {
    const log = logsByMeal[key]
    const items = log ? itemsByLogId[log.id] ?? [] : []

    if (!log) {
      return (
        <div className="flex min-h-[5.5rem] items-center justify-center rounded-xl border border-border/80 bg-card px-4 py-8 shadow-sm">
          <p className="text-center text-sm text-muted-foreground">Tidak ada entri.</p>
        </div>
      )
    }
    if (items.length === 0) {
      return (
        <div className="flex min-h-[5.5rem] items-center justify-center rounded-xl border border-border/80 bg-card px-4 py-8 shadow-sm">
          <p className="text-center text-sm text-muted-foreground">Tidak ada item.</p>
        </div>
      )
    }

    return (
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="max-h-[min(55dvh,420px)] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Makanan</TableHead>
                <TableHead className="text-center">Jml</TableHead>
                <TableHead className="text-center">Satuan</TableHead>
                <TableHead className="text-center">Kkal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="max-w-[40%]">{it.nama_makanan}</TableCell>
                  <TableCell className="text-center tabular-nums">{formatNumberId(it.jumlah)}</TableCell>
                  <TableCell className="text-center text-sm">{it.unit_nama}</TableCell>
                  <TableCell className="text-center tabular-nums font-medium">
                    {formatNumberId(it.kalori_estimasi)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

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

        <Tabs value={tab} onValueChange={setTab} className="flex w-full flex-col gap-3">
          <LayoutGroup id="food-log-detail-tabs">
            <TabsList className="grid h-11 w-full shrink-0 grid-cols-4 gap-1 rounded-xl bg-muted p-1">
              {WAKTU.map(({ key, label }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className={cn(
                    'relative z-0 flex h-full min-h-0 items-center justify-center rounded-lg px-2 py-0 text-xs font-semibold transition-colors',
                    'text-muted-foreground',
                    'data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  )}
                >
                  {tab === key ? (
                    <motion.span
                      layoutId="food-log-detail-tab-chip"
                      className="pointer-events-none absolute inset-0 z-0 rounded-lg border border-border/60 bg-background shadow-sm ring-1 ring-black/[0.04]"
                      transition={TAB_SPRING}
                    />
                  ) : null}
                  <span className="relative z-10">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </LayoutGroup>

          <div className="w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full"
              >
                {renderTabBody(tab)}
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>

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
