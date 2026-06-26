import { useMemo, useState } from 'react'
import { Droplets, CircleCheck } from 'lucide-react'
import { useWaterIntakeByDate } from '@/hooks/useWaterIntake'
import { getWaterTarget } from '@/lib/waterTargetCalculator'
import { formatNumberId, toIsoDateLocal } from '@/lib/format'
import { WaterIntakeDialog } from '@/components/water/WaterIntakeDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KLIEN_DASHBOARD_LOG_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

export function WaterProgressBar({ userId, beratBadan, bare = false }) {
  return (
    <WaterProgressBarInner
      userId={userId}
      beratBadan={beratBadan}
      today={toIsoDateLocal(new Date())}
      bare={bare}
    />
  )
}

export function WaterProgressBarInner({ userId, beratBadan, today, bare = false }) {
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
    if (bare) {
      return (
        <div className={cn(
          'border-t border-border/40 px-5 py-3',
          'cursor-pointer hover:bg-muted/30 transition-colors',
        )}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Droplets className="h-4 w-4 text-blue-500/60" />
            <span>Lengkapi data berat badan melalui ahli gizi untuk melihat target asupan air.</span>
          </div>
        </div>
      )
    }
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

  const barFillColor = reached ? 'bg-emerald-500' : 'bg-sky-300'

  const progressContent = (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-center gap-2">
        <Droplets className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-semibold leading-tight tracking-tight text-neutral-900">
          Asupan air
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-[hsl(210_12%_90%)]">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${barFillColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {reached && <CircleCheck className="h-5 w-5 text-emerald-500 shrink-0" />}
        <span className="text-sm font-medium tabular-nums text-neutral-700 shrink-0">
          {formatNumberId(consumed)} / {formatNumberId(target)} ml
        </span>
      </div>
    </div>
  )

  if (bare) {
    return (
      <>
        <div
          className={cn(
            'border-t border-border/40 px-5 py-3',
            'cursor-pointer hover:bg-muted/30 transition-colors',
          )}
          onClick={() => setDialogOpen(true)}
        >
          {progressContent}
        </div>

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

  return (
    <>
      <Card
        className={`${KLIEN_DASHBOARD_LOG_CARD_SHELL} cursor-pointer hover:shadow-lg transition-shadow`}
        onClick={() => setDialogOpen(true)}
      >
        <CardHeader className="space-y-0 p-0 px-4 pb-2 pt-4 sm:px-5 sm:pb-2 sm:pt-5">
          <div className="flex items-center justify-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-semibold leading-tight tracking-tight text-neutral-900">
              Asupan air
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
          <div className="flex items-center gap-2.5">
            <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-[hsl(210_12%_90%)]">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${barFillColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {reached && <CircleCheck className="h-5 w-5 text-emerald-500 shrink-0" />}
            <span className="text-sm font-medium tabular-nums text-neutral-700 shrink-0">
              {formatNumberId(consumed)} / {formatNumberId(target)} ml
            </span>
          </div>
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
