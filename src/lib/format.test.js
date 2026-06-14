import { describe, expect, it } from 'vitest'
import { formatDateId, toIsoDateLocal, parseIsoDateLocal, formatNumberId, formatDisplayName } from './format'

describe('formatDateId', () => {
  it('returns dash for falsy input', () => {
    expect(formatDateId(null)).toBe('—')
    expect(formatDateId('')).toBe('—')
  })

  it('formats ISO string to Indonesian date', () => {
    const result = formatDateId('2025-01-15')
    expect(result).toBe('15 Januari 2025')
  })

  it('formats Date object', () => {
    const result = formatDateId(new Date(2025, 0, 15))
    expect(result).toBe('15 Januari 2025')
  })
})

describe('toIsoDateLocal', () => {
  it('returns YYYY-MM-DD for a valid date', () => {
    const d = new Date(2025, 5, 15)
    expect(toIsoDateLocal(d)).toBe('2025-06-15')
  })

  it('returns empty string for null/invalid', () => {
    expect(toIsoDateLocal(null)).toBe('')
    expect(toIsoDateLocal(new Date('invalid'))).toBe('')
  })
})

describe('parseIsoDateLocal', () => {
  it('parses valid ISO date to local midnight Date', () => {
    const result = parseIsoDateLocal('2025-06-15')
    expect(result).toBeInstanceOf(Date)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(15)
  })

  it('returns undefined for invalid format', () => {
    expect(parseIsoDateLocal('15-06-2025')).toBeUndefined()
    expect(parseIsoDateLocal('')).toBeUndefined()
    expect(parseIsoDateLocal(null)).toBeUndefined()
  })

  it('round-trips with toIsoDateLocal', () => {
    const original = new Date(2025, 0, 10)
    const iso = toIsoDateLocal(original)
    const parsed = parseIsoDateLocal(iso)
    expect(toIsoDateLocal(parsed)).toBe(iso)
  })
})

describe('formatNumberId', () => {
  it('returns dash for null/NaN', () => {
    expect(formatNumberId(null)).toBe('—')
    expect(formatNumberId(NaN)).toBe('—')
  })

  it('formats number with Indonesian locale', () => {
    expect(formatNumberId(1234.5)).toBe('1.234,5')
  })

  it('formats integer without decimals', () => {
    expect(formatNumberId(1000)).toBe('1.000')
  })
})

describe('formatDisplayName', () => {
  it('returns empty for null/empty', () => {
    expect(formatDisplayName(null)).toBe('')
    expect(formatDisplayName('')).toBe('')
  })

  it('capitalizes first letter of each word', () => {
    expect(formatDisplayName('budi santoso')).toBe('Budi Santoso')
  })

  it('handles single word', () => {
    expect(formatDisplayName('admin')).toBe('Admin')
  })
})
