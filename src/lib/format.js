import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export function formatDateId(d) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d + 'T12:00:00') : d
  return format(date, 'd MMMM yyyy', { locale: id })
}

/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function toIsoDateLocal(d) {
  if (!d || Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse YYYY-MM-DD to local midnight Date (no UTC shift). */
export function parseIsoDateLocal(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatNumberId(n, opts = {}) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...opts,
  }).format(Number(n))
}

