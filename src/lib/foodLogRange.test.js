import { describe, expect, it } from 'vitest'
import { inclusiveRangeEndingAt, compareIsoDates } from './foodLogRange'

describe('inclusiveRangeEndingAt', () => {
  it('returns 7-day range', () => {
    const result = inclusiveRangeEndingAt('2025-06-14', 7)
    expect(result.dateFrom).toBe('2025-06-08')
    expect(result.dateTo).toBe('2025-06-14')
  })

  it('returns single day for dayCount 1', () => {
    const result = inclusiveRangeEndingAt('2025-06-14', 1)
    expect(result.dateFrom).toBe('2025-06-14')
    expect(result.dateTo).toBe('2025-06-14')
  })

  it('returns empty dateFrom for dayCount < 1', () => {
    const result = inclusiveRangeEndingAt('2025-06-14', 0)
    expect(result.dateFrom).toBe('')
  })

  it('returns empty for invalid date', () => {
    const result = inclusiveRangeEndingAt('invalid', 7)
    expect(result.dateFrom).toBe('')
  })
})

describe('compareIsoDates', () => {
  it('returns negative when a < b', () => {
    expect(compareIsoDates('2025-01-01', '2025-01-02')).toBeLessThan(0)
  })

  it('returns positive when a > b', () => {
    expect(compareIsoDates('2025-01-02', '2025-01-01')).toBeGreaterThan(0)
  })

  it('returns 0 when equal', () => {
    expect(compareIsoDates('2025-01-01', '2025-01-01')).toBe(0)
  })

  it('returns 0 for falsy inputs', () => {
    expect(compareIsoDates(null, '2025-01-01')).toBe(0)
    expect(compareIsoDates('2025-01-01', null)).toBe(0)
  })
})
