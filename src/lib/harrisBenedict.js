/**
 * Harris–Benedict BMR (kcal/day).
 * @param {{ sex: 'male' | 'female' | null | undefined; bbKg: number; tbCm: number; ageYears: number }} p
 */
export function harrisBenedictBmr({ sex, bbKg, tbCm, ageYears }) {
  if (!Number.isFinite(ageYears) || ageYears < 1 || !Number.isFinite(bbKg) || !Number.isFinite(tbCm)) {
    return null
  }
  if (sex === 'male') return 66 + 13.7 * bbKg + 5 * tbCm - 6.8 * ageYears
  if (sex === 'female') return 655 + 9.6 * bbKg + 1.8 * tbCm - 4.7 * ageYears
  return null
}
