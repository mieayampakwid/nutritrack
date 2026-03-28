import { formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Renders a formatted calorie number with a smaller, lighter “kkal” suffix. */
export function KaloriValue({ value, className, unitClassName }) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return (
    <span className={cn('inline-flex items-baseline gap-1 tabular-nums', className)}>
      <span className="font-[inherit]">{formatNumberId(value)}</span>
      <span
        className={cn(
          'translate-y-px text-[0.6em] font-extralight leading-none tracking-wide text-muted-foreground/75',
          unitClassName,
        )}
      >
        kkal
      </span>
    </span>
  )
}
