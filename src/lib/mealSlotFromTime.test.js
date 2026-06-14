import { describe, expect, it } from 'vitest'
import { mealSlotFromLocalTime } from './mealSlotFromTime'

function atTime(h, m) {
  const d = new Date(2025, 0, 15, h, m)
  return d
}

describe('mealSlotFromLocalTime', () => {
  it('returns snack when isSnack is true', () => {
    expect(mealSlotFromLocalTime(atTime(7, 0), true)).toBe('snack')
    expect(mealSlotFromLocalTime(atTime(23, 0), true)).toBe('snack')
  })

  it('maps 05:00–10:59 to pagi', () => {
    expect(mealSlotFromLocalTime(atTime(5, 0), false)).toBe('pagi')
    expect(mealSlotFromLocalTime(atTime(7, 30), false)).toBe('pagi')
    expect(mealSlotFromLocalTime(atTime(10, 59), false)).toBe('pagi')
  })

  it('maps 11:00–14:59 to siang', () => {
    expect(mealSlotFromLocalTime(atTime(11, 0), false)).toBe('siang')
    expect(mealSlotFromLocalTime(atTime(12, 0), false)).toBe('siang')
    expect(mealSlotFromLocalTime(atTime(14, 59), false)).toBe('siang')
  })

  it('maps 15:00–18:59 to malam', () => {
    expect(mealSlotFromLocalTime(atTime(15, 0), false)).toBe('malam')
    expect(mealSlotFromLocalTime(atTime(17, 0), false)).toBe('malam')
    expect(mealSlotFromLocalTime(atTime(18, 59), false)).toBe('malam')
  })

  it('maps 19:00–04:59 to malam (late dinner / early morning)', () => {
    expect(mealSlotFromLocalTime(atTime(19, 0), false)).toBe('malam')
    expect(mealSlotFromLocalTime(atTime(23, 0), false)).toBe('malam')
    expect(mealSlotFromLocalTime(atTime(0, 0), false)).toBe('malam')
    expect(mealSlotFromLocalTime(atTime(4, 59), false)).toBe('malam')
  })
})
