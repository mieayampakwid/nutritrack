import { DatePicker } from '@/components/ui/date-picker'
import { compareIsoDates } from '@/lib/foodLogRange'

export function DateRangeFilter({ dateFrom, dateTo, onChange }) {
  function handleFromChange(newFrom) {
    if (!newFrom || !dateTo) return onChange({ dateFrom: newFrom, dateTo })
    if (compareIsoDates(newFrom, dateTo) > 0) {
      onChange({ dateFrom: dateTo, dateTo: newFrom })
    } else {
      onChange({ dateFrom: newFrom, dateTo })
    }
  }

  function handleToChange(newTo) {
    if (!dateFrom || !newTo) return onChange({ dateFrom, dateTo: newTo })
    if (compareIsoDates(dateFrom, newTo) > 0) {
      onChange({ dateFrom: newTo, dateTo: dateFrom })
    } else {
      onChange({ dateFrom, dateTo: newTo })
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-foreground">Dari</label>
        <DatePicker value={dateFrom} onChange={handleFromChange} placeholder="DD-MM-YYYY" />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-foreground">Sampai</label>
        <DatePicker value={dateTo} onChange={handleToChange} placeholder="DD-MM-YYYY" />
      </div>
    </div>
  )
}
