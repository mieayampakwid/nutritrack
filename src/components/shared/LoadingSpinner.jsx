import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ className, label = 'Memuat…' }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground',
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  )
}
