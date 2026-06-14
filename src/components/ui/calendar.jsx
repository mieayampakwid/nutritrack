import { DayPicker } from 'react-day-picker'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { id as localeId } from 'date-fns/locale'
import { cn } from '@/lib/utils'

/** Dapurasri-aligned calendar (Entri Penjualan / date-picker). */
function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      locale={localeId}
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex flex-col gap-4',
        month_caption: 'relative flex h-9 items-center justify-center',
        caption_label: 'text-sm font-medium',
        nav: 'absolute inset-x-0 z-10 flex items-center justify-between',
        button_previous: cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent p-0 text-sm opacity-50 shadow-sm transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        ),
        button_next: cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent p-0 text-sm opacity-50 shadow-sm transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-center text-xs font-medium text-muted-foreground',
        week: 'mt-2 flex',
        day: 'relative h-9 w-9 p-0 text-center text-sm',
        day_button: cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md font-normal transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground',
        ),
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'pointer-events-none text-muted-foreground opacity-50',
        hidden: 'invisible',
        range_start: 'rounded-l-md',
        range_end: 'rounded-r-md',
        range_middle: 'rounded-none bg-accent',
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chClass, orientation, ...chProps }) => {
          if (orientation === 'left') {
            return <ChevronLeft className={cn('h-4 w-4', chClass)} {...chProps} />
          }
          if (orientation === 'right') {
            return <ChevronRight className={cn('h-4 w-4', chClass)} {...chProps} />
          }
          return <ChevronDown className={cn('h-4 w-4', chClass)} {...chProps} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
