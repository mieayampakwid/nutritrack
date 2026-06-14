import { describe, expect, it } from 'vitest'
import {
  capitalizeGreetingName,
  formatClockWib,
  getDashboardGreetingTemplate,
  getLoginGreetingTemplate,
  splitGreetingAtClock,
} from './dashboardGreeting'

describe('capitalizeGreetingName', () => {
  it('capitalizes first letter', () => {
    expect(capitalizeGreetingName('budi')).toBe('Budi')
  })

  it('returns Pengguna for empty/null', () => {
    expect(capitalizeGreetingName('')).toBe('Pengguna')
    expect(capitalizeGreetingName(null)).toBe('Pengguna')
    expect(capitalizeGreetingName(undefined)).toBe('Pengguna')
  })

  it('does not alter already capitalized name', () => {
    expect(capitalizeGreetingName('Budi')).toBe('Budi')
  })
})

describe('formatClockWib', () => {
  it('returns HH:mm:ss format', () => {
    const result = formatClockWib(new Date())
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

describe('getDashboardGreetingTemplate', () => {
  it('contains clock token', () => {
    const template = getDashboardGreetingTemplate('Budi')
    expect(template).toContain('{{clock}}')
  })

  it('includes the display name', () => {
    const template = getDashboardGreetingTemplate('Sari')
    expect(template).toContain('Sari')
  })

  it('uses capitalized name', () => {
    const template = getDashboardGreetingTemplate('budi')
    expect(template).toContain('Budi')
  })
})

describe('getLoginGreetingTemplate', () => {
  it('contains a phase greeting', () => {
    const template = getLoginGreetingTemplate()
    expect(template).toMatch(/Selamat (Pagi|Siang|Sore|Malam)/)
  })

  it('does not contain clock token', () => {
    const template = getLoginGreetingTemplate()
    expect(template).not.toContain('{{clock}}')
  })
})

describe('splitGreetingAtClock', () => {
  it('splits template at clock token', () => {
    const result = splitGreetingAtClock('before{{clock}}after')
    expect(result.hasClock).toBe(true)
    expect(result.before).toBe('before')
    expect(result.after).toBe('after')
  })

  it('returns hasClock false when no token', () => {
    const result = splitGreetingAtClock('no clock here')
    expect(result.hasClock).toBe(false)
    expect(result.before).toBe('no clock here')
    expect(result.after).toBe('')
  })
})
