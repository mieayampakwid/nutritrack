import { describe, expect, it } from 'vitest'
import { getInitials, profileDisplayName } from './profileDisplay'

describe('getInitials', () => {
  it('extracts first and last word initials', () => {
    expect(getInitials('Budi Santoso')).toBe('BS')
  })

  it('returns first two letters for single word', () => {
    expect(getInitials('Admin')).toBe('AD')
  })

  it('returns ? for null/empty', () => {
    expect(getInitials(null)).toBe('?')
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })

  it('handles three-word name (first and last)', () => {
    expect(getInitials('Budi Rahayu Santoso')).toBe('BS')
  })
})

describe('profileDisplayName', () => {
  it('returns nama when present', () => {
    expect(profileDisplayName({ nama: 'Budi', email: 'budi@test.com' })).toBe('Budi')
  })

  it('falls back to email prefix', () => {
    expect(profileDisplayName({ nama: '', email: 'budi@test.com' })).toBe('budi')
    expect(profileDisplayName({ nama: '  ', email: 'budi@test.com' })).toBe('budi')
  })

  it('falls back to Pengguna when nothing available', () => {
    expect(profileDisplayName({})).toBe('Pengguna')
    expect(profileDisplayName(null)).toBe('Pengguna')
  })
})
