import { useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseIsoDateLocal, toIsoDateLocal } from '@/lib/format'

function isIsoDate(s) {
  return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s))
}

/**
 * Dapurasri-style date picker (Entri Penjualan). Value is local calendar date `YYYY-MM-DD`.
 * Uses `modal` popover for correct stacking inside dialogs.
 */
export function DatePicker({
  id: fieldId,
  value,
  onChange,
  className,
  disabled,
  placeholder = 'Pilih tanggal',
}) {
  const [open, setOpen] = useState(false)
  const valid = isIsoDate(value)
  const date = valid ? parseIsoDateLocal(value) : undefined

  function handleSelect(d) {
    onChange?.(d ? toIsoDateLocal(d) : '')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={fieldId}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 min-h-[44px] w-full justify-start text-left text-sm font-normal leading-snug md:h-9 md:min-h-0',
            !date && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className={cn('truncate', !date && 'text-[13px] leading-snug')}>
            {date ? format(date, 'dd MMM yyyy', { locale: localeId }) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          defaultMonth={date}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
