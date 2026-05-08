import { cn } from '@/lib/utils'

export function VitalMetricCard({ label, value, unit, icon, trend, category }) {
  const trendColor = trend === 'up' ? 'text-rose-500' : trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground'
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/[0.03] blur-2xl" />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div className="rounded-lg bg-primary/[0.08] p-1.5 text-primary">
            {icon}
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {value != null ? value.toFixed(1) : '—'}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground sm:text-base">{unit}</span>
          )}
        </div>

        {category && (
          <div className="mt-1 text-xs font-medium text-primary">
            {category}
          </div>
        )}

        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span className={cn('font-semibold', trendColor)}>{trendIcon}</span>
            <span className={cn('text-muted-foreground', trend === 'up' && 'text-rose-600/80', trend === 'down' && 'text-emerald-600/80')}>
              {trend === 'up' ? 'Meningkat' : trend === 'down' ? 'Menurun' : 'Stabil'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
