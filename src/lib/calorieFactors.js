/** Midpoints for clinical ranges (product backlog). */
export const CALORIE_ACTIVITY_OPTIONS = [
  { label: 'Bed rest', range: '1.1–1.2', value: 1.15 },
  { label: 'Normal', range: '1.2–1.3', value: 1.25 },
]

export const CALORIE_STRESS_OPTIONS = [
  { label: 'No stress', range: '1.2–1.3', value: 1.25 },
  { label: 'Mild', range: '1.3–1.4', value: 1.35 },
  { label: 'Moderate', range: '1.4–1.5', value: 1.45 },
  { label: 'Severe', range: '1.5–1.6', value: 1.55 },
  { label: 'Severe / head injury', range: '1.7', value: 1.7 },
]

function near(a, b, eps = 0.001) {
  return Math.abs(Number(a) - Number(b)) < eps
}

export function activityLabelForValue(value) {
  const v = Number(value)
  if (!Number.isFinite(v)) return '—'
  const o = CALORIE_ACTIVITY_OPTIONS.find((x) => near(x.value, v))
  return o ? `${o.label} (${o.range})` : formatFactor(v)
}

export function stressLabelForValue(value) {
  const v = Number(value)
  if (!Number.isFinite(v)) return '—'
  const o = CALORIE_STRESS_OPTIONS.find((x) => near(x.value, v))
  return o ? `${o.label} (${o.range})` : formatFactor(v)
}

function formatFactor(v) {
  return String(v)
}
