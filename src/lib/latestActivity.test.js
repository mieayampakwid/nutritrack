import { describe, expect, it } from 'vitest'
import { latestActivityDate } from './latestActivity'

describe('latestActivityDate', () => {
  it('returns empty when both missing', () => {
    expect(latestActivityDate('', '')).toBe('')
    expect(latestActivityDate(null, undefined)).toBe('')
  })

  it('returns the only provided date', () => {
    expect(latestActivityDate('2026-05-01', '')).toBe('2026-05-01')
    expect(latestActivityDate('', '2026-05-02')).toBe('2026-05-02')
  })

  it('returns the later date', () => {
    expect(latestActivityDate('2026-05-03', '2026-05-02')).toBe('2026-05-03')
    expect(latestActivityDate('2026-05-01', '2026-05-02')).toBe('2026-05-02')
  })
})

