import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthPageShell } from '@/components/auth/AuthPageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendPasswordReset } from '@/lib/changePassword'
import { isValidEmail } from '@/lib/passwordRules'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    if (!isValidEmail(email)) {
      setError('Format email tidak valid')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthPageShell
        title="Cek email Anda"
        description="Jika email terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim. Periksa juga folder spam."
      >
        <Button asChild className="w-full">
          <Link to="/login">Kembali ke halaman masuk</Link>
        </Button>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell title="Lupa kata sandi" description="Masukkan email akun Anda. Kami kirim tautan untuk membuat kata sandi baru.">
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email" className="text-xs font-medium text-muted-foreground">
            Email
          </Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            placeholder="nama@contoh.com"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full font-semibold" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Mengirim…
            </>
          ) : (
            'Kirim tautan'
          )}
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to="/login">Kembali</Link>
        </Button>
      </form>
    </AuthPageShell>
  )
}
