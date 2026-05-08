import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { KLIEN_DASHBOARD_LOG_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

const WAKTU_LABELS = {
  pagi: 'Sarapan',
  siang: 'Makan siang',
  malam: 'Makan malam',
  snack: 'Snack',
}

const MEAL_ORDER = ['pagi', 'siang', 'malam', 'snack']

const MEAL_CARD_COLORS = {
  pagi: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-50/80',
    header: 'bg-emerald-50/90',
    text: 'text-emerald-800',
    item: 'bg-emerald-50/85 ring-emerald-100/60',
    ring: 'ring-emerald-500/25',
    borderDivider: 'border-emerald-200/40',
  },
  siang: {
    border: 'border-orange-400/40',
    bg: 'bg-orange-50/80',
    header: 'bg-orange-50/90',
    text: 'text-orange-800',
    item: 'bg-orange-50/85 ring-orange-100/60',
    ring: 'ring-orange-500/25',
    borderDivider: 'border-orange-200/40',
  },
  malam: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-50/80',
    header: 'bg-blue-50/90',
    text: 'text-blue-800',
    item: 'bg-blue-50/85 ring-blue-100/60',
    ring: 'ring-blue-500/25',
    borderDivider: 'border-blue-200/40',
  },
  snack: {
    border: 'border-rose-400/40',
    bg: 'bg-rose-50/80',
    header: 'bg-rose-50/90',
    text: 'text-rose-800',
    item: 'bg-rose-50/85 ring-rose-100/60',
    ring: 'ring-rose-500/25',
    borderDivider: 'border-rose-200/40',
  },
}

function getMealGroups(logs) {
  const groups = {}
  for (const key of MEAL_ORDER) {
    groups[key] = []
  }
  for (const log of logs ?? []) {
    const key = log.waktu_makan
    if (key && groups[key]) {
      groups[key].push(log)
    }
  }
  return groups
}

function groupTotal(logs) {
  return (logs ?? []).reduce((a, log) => a + (Number(log.total_kalori) || 0), 0)
}

export function FoodLogMealGroups({ logs, itemsByLogId }) {
  const groups = getMealGroups(logs)
  const dayTotal = groupTotal(logs)

  const hasAnyLogs = MEAL_ORDER.some((key) => groups[key].length > 0)

  return (
    <Card className={KLIEN_DASHBOARD_LOG_CARD_SHELL}>
      <CardHeader className="space-y-0 p-0 px-3 pb-2 pt-2 sm:px-4 sm:pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold tracking-tight text-neutral-900">
              Log makanan
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Dikelompokkan berdasarkan waktu makan.</p>
          </div>
          {hasAnyLogs && (
            <div className="shrink-0 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </div>
              <div className="text-base font-semibold tabular-nums text-primary">
                <KaloriValue value={dayTotal} />
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
        {!hasAnyLogs ? (
          <div className="rounded-xl border border-border/70 bg-background/60 p-4 text-center shadow-sm">
            <p className="text-sm font-medium text-foreground">Belum ada catatan makanan.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Mulai dari 1 diary dulu. Semakin konsisten, grafik dan ringkasanmu makin akurat.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {MEAL_ORDER.map((key) => {
              const groupLogs = groups[key]
              const groupKalori = groupTotal(groupLogs)
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
                    <span className={cn('font-semibold', colors.text)}>{label}</span>
                    <span className="font-semibold tabular-nums text-primary">
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
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Total hari ini</span>
                <span className="font-semibold tabular-nums text-primary">
                  <KaloriValue value={dayTotal} />
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
