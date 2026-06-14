import { describe, expect, it } from 'vitest'
import { roleLabel, ROLE_LABELS, USERS_PAGE_SIZE } from './adminUsers'

describe('roleLabel', () => {
  it('returns correct label for known roles', () => {
    expect(roleLabel('admin')).toBe('Admin')
    expect(roleLabel('ahli_gizi')).toBe('Ahli gizi')
    expect(roleLabel('klien')).toBe('Klien')
  })

  it('returns raw string for unknown role', () => {
    expect(roleLabel('unknown')).toBe('unknown')
  })
})

describe('ROLE_LABELS', () => {
  it('has entries for all roles', () => {
    expect(Object.keys(ROLE_LABELS)).toEqual(['admin', 'ahli_gizi', 'klien'])
  })
})

describe('USERS_PAGE_SIZE', () => {
  it('is 10', () => {
    expect(USERS_PAGE_SIZE).toBe(10)
  })
})
