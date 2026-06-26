import { useMemo, useState } from 'react'
import { Droplets } from 'lucide-react'
import { useWaterIntakeByDate } from '@/hooks/useWaterIntake'
import { getWaterTarget } from '@/lib/waterTargetCalculator'
import { formatNumberId, toIsoDateLocal } from '@/lib/format'
import { WaterIntakeDialog } from '@/components/water/WaterIntakeDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KLIEN_DASHBOARD_LOG_CARD_SHELL } from '@/lib/pageCard'

export function WaterProgressBar({ userId, beratBadan }) {
  return (
    <WaterProgressBarInner
      userId={userId}
      beratBadan={beratBadan}
      today={toIsoDateLocal(new Date())}
    />
  )
}

export function WaterProgressBarInner({ userId, beratBadan, today }) {
  const target = getWaterTarget(beratBadan)
  const { data: entries = [] } = useWaterIntakeByDate(
    target != null ? userId : null,
    target != null ? today : null,
  )

  const [dialogOpen, setDialogOpen] = useState(false)

  const consumed = useMemo(() => {
    if (!entries.length) return 0
    return entries.reduce((sum, e) => sum + (e.volume_ml || 0), 0)
  }, [entries])

  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  const reached = consumed >= target && target > 0

  if (target == null) {
    return (
      <Card className={KLIEN_DASHBOARD_LOG_CARD_SHELL}>
        <CardContent className="px-4 py-4">
          <p className="text-center text-xs text-muted-foreground">
            Lengkapi data berat badan melalui ahli gizi untuk melihat target asupan air.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card
        className={`${KLIEN_DASHBOARD_LOG_CARD_SHELL} cursor-pointer hover:shadow-lg transition-shadow`}
        onClick={() => setDialogOpen(true)}
      >
        <CardHeader className="space-y-0 p-0 px-4 pb-2 pt-4 sm:px-5 sm:pb-2 sm:pt-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold leading-tight tracking-tight text-neutral-900">
                  Asupan air
                </CardTitle>
              </div>
            </div>
            <span className="text-sm font-medium tabular-nums text-neutral-700">
              {formatNumberId(consumed)} / {formatNumberId(target)} ml
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                reached ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            {reached ? 'Tercapai' : `${Math.round(pct)}%`}
          </p>
        </CardContent>
      </Card>

      <WaterIntakeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        beratBadan={beratBadan}
        tanggal={today}
      />
    </>
  )
}
