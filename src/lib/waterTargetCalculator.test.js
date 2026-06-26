import { describe, expect, it } from 'vitest'
import { getWaterTarget } from './waterTargetCalculator'

describe('getWaterTarget', () => {
  it('returns null for null input', () => {
    expect(getWaterTarget(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(getWaterTarget(undefined)).toBeNull()
  })

  it('returns null for zero', () => {
    expect(getWaterTarget(0)).toBeNull()
  })

  it('returns null for negative input', () => {
    expect(getWaterTarget(-5)).toBeNull()
  })

  it('calculates target as BB × 30', () => {
    expect(getWaterTarget(70)).toBe(2100)
  })

  it('rounds to nearest integer', () => {
    expect(getWaterTarget(55.7)).toBe(1671)
  })

  it('handles string input', () => {
    expect(getWaterTarget('70')).toBe(2100)
  })

  it('handles small weight', () => {
    expect(getWaterTarget(1)).toBe(30)
  })
})
