export function calculateBMI(beratKg, tinggiCm) {
  if (
    beratKg == null ||
    tinggiCm == null ||
    Number(beratKg) <= 0 ||
    Number(tinggiCm) <= 0
  ) {
    return null
  }
  const tinggiM = Number(tinggiCm) / 100
  const bmi = Number(beratKg) / (tinggiM * tinggiM)
  return parseFloat(bmi.toFixed(2))
}

export function getBMICategory(bmi) {
  if (bmi == null || Number.isNaN(bmi)) {
    return { label: '—', color: 'slate' }
  }
  if (bmi < 18.5) return { label: 'Underweight', color: 'blue' }
  if (bmi < 23.0) return { label: 'Normal', color: 'green' }
  if (bmi < 27.5) return { label: 'Overweight', color: 'yellow' }
  return { label: 'Obese', color: 'red' }
}
