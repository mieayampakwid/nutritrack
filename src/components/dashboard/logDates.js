import { toIsoDateLocal } from '@/lib/format'

/**
 * Derive two distinct sets of dates from food_log rows:
 * - `loggedDates`: every date that has at least one food log, regardless of when
 *   it was created. Drives the weekly checkmark indicator so backdated entries
 *   still mark their day as checked.
 * - `streakDates`: only dates whose entry was created on the same calendar day.
 *   Drives the streak counter, which intentionally excludes backdated entries.
 */
export function deriveLogDates(rows) {
  const loggedDates = new Set()
  const streakDates = new Set()
  for (const row of rows ?? []) {
    const tgl = row?.tanggal
    if (!tgl) continue
    loggedDates.add(tgl)
    const createdDate = toIsoDateLocal(new Date(row.created_at))
    if (createdDate === tgl) streakDates.add(tgl)
  }
  return { loggedDates: [...loggedDates], streakDates: [...streakDates] }
}
