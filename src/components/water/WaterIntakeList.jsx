import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useWaterIntakeByDate, useDeleteWaterIntake } from '@/hooks/useWaterIntake'
import { formatDateId, formatNumberId } from '@/lib/format'
import { useAuth } from '@/hooks/useAuth'

function formatTimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function WaterIntakeList({ userId, tanggal, onEntryClick, silentDelete = false }) {
  const { profile } = useAuth()
  const { data: entries = [], isLoading } = useWaterIntakeByDate(userId, tanggal)
  const deleteMutation = useDeleteWaterIntake({ silent: silentDelete })
  const [confirmId, setConfirmId] = useState(null)

  const confirmEntry = confirmId ? entries.find((e) => e.id === confirmId) : null
  const showDelete = profile?.role === 'klien' || profile?.role === 'ahli_gizi'

  if (isLoading) {
    return (
      <div className="space-y-2 py-1">
        <div className="h-8 w-full animate-pulse rounded-md bg-muted/60" />
        <div className="h-8 w-full animate-pulse rounded-md bg-muted/50" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="py-2 text-center text-xs text-muted-foreground">
        Belum ada catatan asupan air untuk tanggal ini.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            onClick={() => onEntryClick?.(entry.volume_ml)}
            className={`flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 ${onEntryClick ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {formatTimeLocal(entry.created_at)}
              </span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {formatNumberId(entry.volume_ml)} ml
              </span>
            </div>
            {showDelete && (
              <button
                type="button"
                onClick={() => setConfirmId(entry.id)}
                className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                aria-label={`Hapus entri ${entry.volume_ml} ml`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {confirmEntry && (
        <Dialog
          open={Boolean(confirmId)}
          onOpenChange={(o) => {
            if (!o && !deleteMutation.isPending) setConfirmId(null)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Hapus entri asupan air?</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 text-sm">
              <p className="text-muted-foreground">
                Entri berikut akan dihapus permanen:
              </p>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 space-y-0.5 text-xs">
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">Volume:</span>
                  <span className="font-medium text-foreground">{formatNumberId(confirmEntry.volume_ml)} ml</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">Waktu:</span>
                  <span className="font-medium text-foreground">{formatTimeLocal(confirmEntry.created_at)}</span>
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
              <Button variant="outline" onClick={() => setConfirmId(null)} disabled={deleteMutation.isPending}>
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending || !confirmId}
                onClick={() => {
                  if (!confirmId || !userId) return
                  deleteMutation.mutate(
                    {
                      intakeId: confirmId,
                      userId,
                      volumeMl: confirmEntry.volume_ml,
                      tanggal: confirmEntry.tanggal,
                      createdAt: confirmEntry.created_at,
                    },
                    { onSuccess: () => setConfirmId(null) },
                  )
                }}
              >
                {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
