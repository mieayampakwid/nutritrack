import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function DashboardActionCard({ to, title, desc, icon, className }) {
  const Icon = icon
  return (
    <Link to={to} className={cn('group block h-full outline-none', className)}>
      <Card
        className={cn(
          'relative h-full border-border/60 bg-card/95 transition-all duration-200',
          'hover:border-primary/30 hover:shadow-md hover:shadow-primary/6',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <ArrowUpRight
          className="absolute right-4 top-4 h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-60"
          aria-hidden
        />
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pr-10 sm:gap-4 sm:p-6 sm:pr-12">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 sm:h-12 sm:w-12">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="text-[0.9375rem] font-semibold leading-snug sm:text-base">{title}</CardTitle>
            <CardDescription className="leading-relaxed">{desc}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}
