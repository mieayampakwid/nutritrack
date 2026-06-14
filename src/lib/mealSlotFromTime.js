/** @typedef {'pagi' | 'siang' | 'malam' | 'snack'} MealSlot */

/**
 * Maps local submission time to meal slot (WIB-style wall clock on client device).
 * Snack toggle overrides and always returns `snack`.
 * @param {Date} at
 * @param {boolean} isSnack
 * @returns {MealSlot}
 */
export function mealSlotFromLocalTime(at, isSnack) {
  if (isSnack) return 'snack'
  const minutes = at.getHours() * 60 + at.getMinutes()
  // 05:00–10:59
  if (minutes >= 5 * 60 && minutes <= 10 * 60 + 59) return 'pagi'
  // 11:00–14:59
  if (minutes >= 11 * 60 && minutes <= 14 * 60 + 59) return 'siang'
  // 15:00–18:59
  if (minutes >= 15 * 60 && minutes <= 18 * 60 + 59) return 'malam'
  // 19:00–04:59 → late dinner (still `malam` in DB)
  return 'malam'
}
