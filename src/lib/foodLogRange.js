import { parseIsoDateLocal, toIsoDateLocal } from '@/lib/format'

/** Inclusive calendar range ending at `endIso`: exactly `dayCount` days. */
export function inclusiveRangeEndingAt(endIso, dayCount) {
  const end = parseIsoDateLocal(endIso)
  if (!end || dayCount < 1) return { dateFrom: '', dateTo: endIso || '' }
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  start.setDate(start.getDate() - (dayCount - 1))
  return { dateFrom: toIsoDateLocal(start), dateTo: endIso }
}

export function compareIsoDates(a, b) {
  if (!a || !b) return 0
  return a.localeCompare(b)
}
