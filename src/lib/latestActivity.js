/**
 * Pick the latest activity date (ISO YYYY-MM-DD) given measurement + food log dates.
 * Returns '' when neither exists.
 * @param {string|undefined|null} measurementDate
 * @param {string|undefined|null} foodLogDate
 */
export function latestActivityDate(measurementDate, foodLogDate) {
  const m = measurementDate ? String(measurementDate) : ''
  const f = foodLogDate ? String(foodLogDate) : ''
  if (!m && !f) return ''
  if (!m) return f
  if (!f) return m
  return m >= f ? m : f
}

