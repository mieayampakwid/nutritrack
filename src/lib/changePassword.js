import { supabase } from '@/lib/supabase'

/** Mengambil pesan Indonesia dari respons galat Edge Function bila ada. */
async function serverMessage(error) {
  try {
    const res = error?.context
    if (res && typeof res.json === 'function') {
      const body = await res.json()
      if (body?.error) return String(body.error)
    }
  } catch {
    /* abaikan: pakai pesan umum */
  }
  return null
}

/**
 * Mengganti kata sandi lewat Edge Function `change-password` (satu-satunya jalan yang
 * menurunkan flag must_change_password). oldPassword null = sesi "lupa kata sandi".
 */
export async function changePassword(newPassword, oldPassword = null) {
  const body = { password: newPassword }
  if (oldPassword) body.old_password = oldPassword
  const { error } = await supabase.functions.invoke('change-password', { body })
  if (error) {
    throw new Error((await serverMessage(error)) ?? 'Gagal mengubah kata sandi. Coba lagi nanti.')
  }
}

/** Kirim email atur ulang kata sandi. Tidak pernah menyebut apakah email terdaftar. */
export async function sendPasswordReset(email) {
  const redirectTo = `${window.location.origin}/atur-ulang-kata-sandi`
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
  if (error) {
    const raw = (error.message ?? '').toLowerCase()
    const limited = ['rate', 'limit', 'seconds'].some((k) => raw.includes(k))
    throw new Error(
      limited
        ? 'Terlalu sering meminta tautan. Tunggu sebentar lalu coba lagi.'
        : 'Gagal mengirim email. Coba lagi nanti.',
    )
  }
}
