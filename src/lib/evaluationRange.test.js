import { describe, expect, it } from 'vitest'
import { inclusiveDaysBetweenIso, isAtLeastEvaluationDays } from './evaluationRange'

describe('inclusiveDaysBetweenIso', () => {
  it('returns 14 for exactly two-week inclusive window', () => {
    expect(inclusiveDaysBetweenIso('2025-01-01', '2025-01-14')).toBe(14)
  })

  it('returns 1 for same day', () => {
    expect(inclusiveDaysBetweenIso('2025-06-01', '2025-06-01')).toBe(1)
  })

  it('returns null for invalid date', () => {
    expect(inclusiveDaysBetweenIso('', '2025-01-14')).toBe(null)
    expect(inclusiveDaysBetweenIso('2025-01-01', 'not-a-date')).toBe(null)
  })
})

describe('isAtLeastEvaluationDays', () => {
  it('returns false when fewer than 14 inclusive days', () => {
    expect(isAtLeastEvaluationDays('2025-01-01', '2025-01-13')).toBe(false)
  })

  it('returns true for exactly 14 inclusive days', () => {
    expect(isAtLeastEvaluationDays('2025-01-01', '2025-01-14')).toBe(true)
  })

  it('returns true for longer ranges', () => {
    expect(isAtLeastEvaluationDays('2025-01-01', '2025-01-31')).toBe(true)
  })
})
