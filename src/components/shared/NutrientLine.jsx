import { formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

export function NutrientLine({ nutrients, className }) {
  const { karbohidrat, protein, lemak, serat, natrium } = nutrients
  if (!karbohidrat && !protein && !lemak && !serat && !natrium) return null
  return (
    <p className={cn('text-[10px] leading-none text-muted-foreground/70', className)}>
      K: {formatNumberId(karbohidrat, { maximumFractionDigits: 1 })}g
      <span className="mx-1 text-muted-foreground/30">·</span>
      P: {formatNumberId(protein, { maximumFractionDigits: 1 })}g
      <span className="mx-1 text-muted-foreground/30">·</span>
      L: {formatNumberId(lemak, { maximumFractionDigits: 1 })}g
      <span className="mx-1 text-muted-foreground/30">·</span>
      S: {formatNumberId(serat, { maximumFractionDigits: 1 })}g
      <span className="mx-1 text-muted-foreground/30">·</span>
      Na: {formatNumberId(natrium, { maximumFractionDigits: 0 })}mg
    </p>
  )
}
