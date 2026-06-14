import { differenceInCalendarDays } from 'date-fns'
import { parseIsoDateLocal } from '@/lib/format'

/**
 * Inclusive calendar-day count from dateFrom to dateTo (YYYY-MM-DD).
 * @returns {number | null} null if either date is invalid
 */
export function inclusiveDaysBetweenIso(dateFrom, dateTo) {
  const a = parseIsoDateLocal(dateFrom)
  const b = parseIsoDateLocal(dateTo)
  if (!a || !b) return null
  return differenceInCalendarDays(b, a) + 1
}

/** Sprint #4: nutritionist evaluation window at least 14 calendar days (inclusive). */
export function isAtLeastEvaluationDays(dateFrom, dateTo, minInclusiveDays = 14) {
  const d = inclusiveDaysBetweenIso(dateFrom, dateTo)
  if (d == null) return false
  return d >= minInclusiveDays
}
