export const WAKTU_LABELS = {
  pagi: 'Sarapan',
  siang: 'Makan siang',
  malam: 'Makan malam',
  snack: 'Snack',
}

export const MEAL_ORDER = ['pagi', 'siang', 'malam', 'snack']

export const MEAL_CARD_COLORS = {
  pagi: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-50/80',
    header: 'bg-emerald-50/90',
    text: 'text-emerald-800',
    item: 'bg-emerald-50/85 ring-emerald-100/60',
    ring: 'ring-emerald-500/25',
    borderDivider: 'border-emerald-200/40',
  },
  siang: {
    border: 'border-orange-400/40',
    bg: 'bg-orange-50/80',
    header: 'bg-orange-50/90',
    text: 'text-orange-800',
    item: 'bg-orange-50/85 ring-orange-100/60',
    ring: 'ring-orange-500/25',
    borderDivider: 'border-orange-200/40',
  },
  malam: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-50/80',
    header: 'bg-blue-50/90',
    text: 'text-blue-800',
    item: 'bg-blue-50/85 ring-blue-100/60',
    ring: 'ring-blue-500/25',
    borderDivider: 'border-blue-200/40',
  },
  snack: {
    border: 'border-rose-400/40',
    bg: 'bg-rose-50/80',
    header: 'bg-rose-50/90',
    text: 'text-rose-800',
    item: 'bg-rose-50/85 ring-rose-100/60',
    ring: 'ring-rose-500/25',
    borderDivider: 'border-rose-200/40',
  },
}

export function getMealGroups(logs) {
  const groups = {}
  for (const key of MEAL_ORDER) {
    groups[key] = []
  }
  for (const log of logs ?? []) {
    const key = log.waktu_makan
    if (key && groups[key]) {
      groups[key].push(log)
    }
  }
  return groups
}

export function groupTotal(logs) {
  return (logs ?? []).reduce((a, log) => a + (Number(log.total_kalori) || 0), 0)
}

export function groupNutrients(logs) {
  return (logs ?? []).reduce(
    (a, log) => ({
      karbohidrat: a.karbohidrat + (Number(log.total_karbohidrat) || 0),
      protein: a.protein + (Number(log.total_protein) || 0),
      lemak: a.lemak + (Number(log.total_lemak) || 0),
      serat: a.serat + (Number(log.total_serat) || 0),
      natrium: a.natrium + (Number(log.total_natrium) || 0),
    }),
    { karbohidrat: 0, protein: 0, lemak: 0, serat: 0, natrium: 0 },
  )
}
