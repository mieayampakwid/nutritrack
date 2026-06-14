import { describe, expect, it } from 'vitest'
import { calculateBMI, getBMICategory, getBMICategoryAsiaPacific } from './bmiCalculator'

describe('calculateBMI', () => {
  it('returns null for null inputs', () => {
    expect(calculateBMI(null, 170)).toBeNull()
    expect(calculateBMI(70, null)).toBeNull()
  })

  it('returns null for zero or negative inputs', () => {
    expect(calculateBMI(0, 170)).toBeNull()
    expect(calculateBMI(70, 0)).toBeNull()
    expect(calculateBMI(-5, 170)).toBeNull()
    expect(calculateBMI(70, -10)).toBeNull()
  })

  it('calculates BMI correctly', () => {
    expect(calculateBMI(70, 170)).toBeCloseTo(24.22, 1)
  })

  it('handles string inputs', () => {
    expect(calculateBMI('70', '170')).toBeCloseTo(24.22, 1)
  })

  it('returns value rounded to 2 decimal places', () => {
    const result = calculateBMI(55, 165)
    if (result !== null) {
      const decimals = String(result).split('.')[1]?.length ?? 0
      expect(decimals).toBeLessThanOrEqual(2)
    }
  })
})

describe('getBMICategory', () => {
  it('returns fallback for null/NaN', () => {
    expect(getBMICategory(null)).toEqual({ label: '—', color: 'slate' })
    expect(getBMICategory(NaN)).toEqual({ label: '—', color: 'slate' })
  })

  it('classifies underweight (< 18.5)', () => {
    expect(getBMICategory(17)).toEqual({ label: 'Underweight', color: 'blue' })
  })

  it('classifies normal (18.5–22.9)', () => {
    expect(getBMICategory(18.5)).toEqual({ label: 'Normal', color: 'green' })
    expect(getBMICategory(22.9)).toEqual({ label: 'Normal', color: 'green' })
  })

  it('classifies overweight (23.0–27.4)', () => {
    expect(getBMICategory(23.0)).toEqual({ label: 'Overweight', color: 'yellow' })
    expect(getBMICategory(27.4)).toEqual({ label: 'Overweight', color: 'yellow' })
  })

  it('classifies obese (>= 27.5)', () => {
    expect(getBMICategory(27.5)).toEqual({ label: 'Obese', color: 'red' })
    expect(getBMICategory(35)).toEqual({ label: 'Obese', color: 'red' })
  })
})

describe('getBMICategoryAsiaPacific', () => {
  it('returns fallback for null/NaN', () => {
    expect(getBMICategoryAsiaPacific(null)).toEqual({ label: '—', color: 'slate' })
    expect(getBMICategoryAsiaPacific(NaN)).toEqual({ label: '—', color: 'slate' })
  })

  it('classifies underweight (< 18.5)', () => {
    expect(getBMICategoryAsiaPacific(17)).toEqual({ label: 'Underweight', color: 'blue' })
  })

  it('classifies normal (18.5–22.9)', () => {
    expect(getBMICategoryAsiaPacific(18.5)).toEqual({ label: 'Normal', color: 'green' })
    expect(getBMICategoryAsiaPacific(22.9)).toEqual({ label: 'Normal', color: 'green' })
  })

  it('classifies overweight (23.0–24.9)', () => {
    expect(getBMICategoryAsiaPacific(23.0)).toEqual({ label: 'Overweight', color: 'yellow' })
    expect(getBMICategoryAsiaPacific(24.9)).toEqual({ label: 'Overweight', color: 'yellow' })
  })

  it('classifies Obesity I (25.0–29.9)', () => {
    expect(getBMICategoryAsiaPacific(25.0)).toEqual({ label: 'Obesity I', color: 'orange' })
    expect(getBMICategoryAsiaPacific(29.9)).toEqual({ label: 'Obesity I', color: 'orange' })
  })

  it('classifies Obesity II (>= 30.0)', () => {
    expect(getBMICategoryAsiaPacific(30.0)).toEqual({ label: 'Obesity II', color: 'red' })
    expect(getBMICategoryAsiaPacific(40)).toEqual({ label: 'Obesity II', color: 'red' })
  })
})
