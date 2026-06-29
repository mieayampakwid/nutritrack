export function getWaterTarget(bbKg) {
  if (bbKg == null || bbKg <= 0) return null
  return Math.round(bbKg * 30)
}
