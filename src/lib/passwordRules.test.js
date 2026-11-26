import { describe, expect, it } from 'vitest'
import { isValidEmail, validateNewPassword, validatePasswordChange } from './passwordRules'

describe('passwordRules', () => {
  it('validates email format', () => {
    expect(isValidEmail(' a@b.co ')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
  })
  it('rejects short, long, and mismatched new passwords', () => {
    expect(validateNewPassword('abc1234', 'abc1234')).toMatch(/minimal 8/)
    expect(validateNewPassword('a'.repeat(73), 'a'.repeat(73))).toMatch(/maksimal 72/)
    expect(validateNewPassword('abcd1234', 'abcd12345')).toMatch(/tidak cocok/)
    expect(validateNewPassword('abcd1234', 'abcd1234')).toBeNull()
  })
  it('requires old password unless recovery, and a different new one', () => {
    const base = { password: 'abcd1234', confirmation: 'abcd1234' }
    expect(validatePasswordChange({ ...base, oldPassword: '', requireOld: true })).toMatch(/lama/)
    expect(validatePasswordChange({ ...base, oldPassword: 'abcd1234', requireOld: true })).toMatch(/berbeda/)
    expect(validatePasswordChange({ ...base, oldPassword: 'lama1234', requireOld: true })).toBeNull()
    expect(validatePasswordChange({ ...base, requireOld: false })).toBeNull()
  })
})
