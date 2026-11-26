/** Aturan kata sandi — sama dengan PasswordRules di aplikasi mobile dan fungsi change-password. */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72
export const LOGIN_MIN_LENGTH = 6

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email) {
  return EMAIL.test(String(email ?? '').trim())
}

/** Mengembalikan pesan galat (Indonesia) atau null bila kata sandi baru dapat diterima. */
export function validateNewPassword(password, confirmation) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter`
  if (password.length > PASSWORD_MAX_LENGTH) return `Kata sandi maksimal ${PASSWORD_MAX_LENGTH} karakter`
  if (password !== confirmation) return 'Konfirmasi kata sandi tidak cocok'
  return null
}

/** Kata sandi lama wajib, kecuali tepat setelah tautan "lupa kata sandi" (requireOld = false). */
export function validatePasswordChange({ oldPassword = '', password, confirmation, requireOld }) {
  if (requireOld && oldPassword.length === 0) return 'Masukkan kata sandi lama'
  const err = validateNewPassword(password, confirmation)
  if (err) return err
  if (requireOld && oldPassword === password) return 'Kata sandi baru harus berbeda dari kata sandi lama'
  return null
}
