import { useState } from 'react'
import { format, parse } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toIsoDateLocal } from '@/lib/format'

function isIsoDate(s) {
  return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s))
}

/**
 * Date picker with calendar popup and direct text input.
 * Value is local calendar date `YYYY-MM-DD`.
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
  const [draft, setDraft] = useState('')
  const valid = isIsoDate(value)
  const date = valid ? parse(value, 'yyyy-MM-dd', new Date()) : undefined

  function handleSelect(d) {
    onChange?.(d ? toIsoDateLocal(d) : '')
    setOpen(false)
  }

  function handleInputChange(e) {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let masked = digits
    if (digits.length > 4) masked = digits.slice(0, 4) + '-' + digits.slice(4)
    if (digits.length > 6) masked = masked.slice(0, 7) + '-' + digits.slice(6)
    setDraft(masked)
    if (digits.length === 8) {
      const parsed = parse(masked, 'yyyy-MM-dd', new Date())
      if (!isNaN(parsed.getTime())) {
        onChange?.(masked)
      }
    }
  }

  function handleBlur() {
    if (draft && /^\d{4}-\d{2}-\d{2}$/.test(draft)) return
    setDraft('')
  }

  const displayValue = draft || (date ? format(date, 'dd MMM yyyy', { locale: localeId }) : '')

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={fieldId}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 min-h-[44px] w-full justify-start text-left text-base font-normal md:h-9 md:min-h-0',
            !date && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{displayValue || placeholder}</span>
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
        <div className="border-t px-3 py-2">
          <Input
            type="text"
            value={draft || value || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="YYYY-MM-DD"
            className="h-8 text-sm"
            autoComplete="off"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
