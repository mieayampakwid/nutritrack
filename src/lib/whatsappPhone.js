/**
 * Normalize Indonesian-style input to digits-only wa.me id (e.g. 6281234567890).
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function normalizeIndonesiaWhatsAppDigits(raw) {
  if (raw == null) return null
  const d = String(raw).replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('62')) return d
  if (d.startsWith('0')) return `62${d.slice(1)}`
  if (d.startsWith('8')) return `62${d}`
  return d
}
