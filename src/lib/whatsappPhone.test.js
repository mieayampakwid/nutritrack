import { describe, expect, it } from 'vitest'
import { normalizeIndonesiaWhatsAppDigits } from './whatsappPhone'

describe('normalizeIndonesiaWhatsAppDigits', () => {
  it('returns null for null/undefined', () => {
    expect(normalizeIndonesiaWhatsAppDigits(null)).toBeNull()
    expect(normalizeIndonesiaWhatsAppDigits(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(normalizeIndonesiaWhatsAppDigits('')).toBeNull()
  })

  it('passes through numbers starting with 62', () => {
    expect(normalizeIndonesiaWhatsAppDigits('6281234567890')).toBe('6281234567890')
  })

  it('strips leading 0 and prepends 62', () => {
    expect(normalizeIndonesiaWhatsAppDigits('081234567890')).toBe('6281234567890')
  })

  it('prepends 62 for numbers starting with 8', () => {
    expect(normalizeIndonesiaWhatsAppDigits('81234567890')).toBe('6281234567890')
  })

  it('strips non-digit characters', () => {
    expect(normalizeIndonesiaWhatsAppDigits('+62 812-3456-7890')).toBe('6281234567890')
  })

  it('returns digits as-is for other prefixes', () => {
    expect(normalizeIndonesiaWhatsAppDigits('12345678')).toBe('12345678')
  })
})
