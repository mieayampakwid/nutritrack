import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AuthPageShell } from '@/components/auth/AuthPageShell'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { changePassword } from '@/lib/changePassword'
import { validatePasswordChange, PASSWORD_MIN_LENGTH } from '@/lib/passwordRules'
import { dashboardPath } from '@/lib/routes'

/**
 * Ganti kata sandi. Tiga keadaan:
 * - wajib (profile.must_change_password): tidak bisa dilewati, hanya bisa keluar;
 * - sukarela (menu akun): ada tautan kembali;
 * - recovery (tautan "lupa kata sandi"): kata sandi lama tidak diminta.
 */
export function ChangePasswordPage({ recovery = false }) {
  const { session, profile, loading, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [oldPassword, setOldPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (loading) {
    return (
      <AuthPageShell title="Memuat…">
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Memuat" />
        </div>
      </AuthPageShell>
    )
  }

  if (!session) {
    if (recovery) {
      return (
        <AuthPageShell
          title="Tautan tidak berlaku"
          description="Tautan atur ulang kata sandi sudah kedaluwarsa atau sudah dipakai."
        >
          <Button asChild className="w-full">
            <Link to="/lupa-kata-sandi">Minta tautan baru</Link>
          </Button>
        </AuthPageShell>
      )
    }
    return <Navigate to="/login" replace />
  }

  const forced = Boolean(profile?.must_change_password)
  const requireOld = !recovery

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    const msg = validatePasswordChange({ oldPassword, password, confirmation, requireOld })
    if (msg) {
      setError(msg)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await changePassword(password, requireOld ? oldPassword : null)
      await refreshProfile()
      toast.success('Kata sandi berhasil diubah.')
      navigate(profile ? dashboardPath(profile.role) : '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const title = recovery ? 'Atur kata sandi baru' : forced ? 'Buat kata sandi baru' : 'Ganti kata sandi'
  const description = forced
    ? 'Demi keamanan, ganti kata sandi sementara Anda sebelum melanjutkan.'
    : `Minimal ${PASSWORD_MIN_LENGTH} karakter.`

  return (
    <AuthPageShell title={title} description={description}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {requireOld ? (
          <PasswordField
            id="old-password"
            label="Kata sandi lama"
            value={oldPassword}
            onChange={setOldPassword}
            autoComplete="current-password"
            autoFocus
          />
        ) : null}
        <PasswordField id="new-password" label="Kata sandi baru" value={password} onChange={setPassword} autoFocus={!requireOld} />
        <PasswordField id="confirm-password" label="Ulangi kata sandi baru" value={confirmation} onChange={setConfirmation} />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full font-semibold" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Menyimpan…
            </>
          ) : (
            'Simpan kata sandi'
          )}
        </Button>
        {forced ? (
          <Button type="button" variant="ghost" className="w-full" onClick={() => signOut()}>
            Keluar
          </Button>
        ) : (
          <Button asChild variant="ghost" className="w-full">
            <Link to="/">Batal</Link>
          </Button>
        )}
      </form>
    </AuthPageShell>
  )
}
