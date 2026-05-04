/** Display labels for anthropometric_change_log.field (Indonesian). */
export const ANTHROPOMETRIC_FIELD_LABELS = {
  berat_badan: 'Berat badan (kg)',
  tinggi_badan: 'Tinggi badan (cm)',
  massa_otot: 'Massa otot (kg)',
  massa_lemak: 'Massa lemak (%)',
  lingkar_pinggang: 'Lingkar pinggang (cm)',
  bmi: 'BMI',
  energi_total: 'Kebutuhan energi (kkal)',
}

export function anthropometricFieldLabel(field) {
  return ANTHROPOMETRIC_FIELD_LABELS[field] ?? field
}
