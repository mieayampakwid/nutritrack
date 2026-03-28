import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { APP_DISPLAY_NAME } from '@/lib/appMeta'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

function dashboardPath(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'ahli_gizi') return '/gizi/dashboard'
  return '/klien/dashboard'
}

export function LoginPage() {
  const { session, profile, loading, profileLoadError } = useAuth()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/30 p-4">
        <Card className="w-full max-w-sm animate-card-in border border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-2 pb-2 pt-8 text-center">
            <CardTitle className="text-lg font-bold leading-snug tracking-tight">{APP_DISPLAY_NAME}</CardTitle>
            <CardDescription>
              Salin <code className="text-xs">.env.example</code> ke <code className="text-xs">.env</code> dan isi URL
              serta anon key Supabase. Muat ulang server setelah mengubah <code className="text-xs">.env</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (session && profile && profile.is_active !== false) {
    const to = loc.state?.from?.pathname ?? dashboardPath(profile.role)
    return <Navigate to={to} replace />
  }

  if (session && !loading && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/30 p-4">
        <Card className="w-full max-w-sm animate-card-in border border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-2 pb-2 pt-8 text-center">
            <CardTitle className="text-xl font-bold tracking-tight">Profil tidak ditemukan</CardTitle>
            <CardDescription className="space-y-2 text-left">
              <span>
                Akun tidak memiliki baris profil, baris disembunyikan oleh RLS, atau proyek Supabase di{' '}
                <code className="text-xs">.env</code> tidak cocok dengan basis data.
              </span>
              {profileLoadError ? (
                <span className="block text-sm text-destructive">API: {profileLoadError}</span>
              ) : (
                <span className="block text-sm text-muted-foreground">
                  Jika baris ada di Table Editor, jalankan{' '}
                  <code className="text-xs">supabase/fix_profiles_access.sql</code> di SQL Editor.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 pt-4">
            <Button type="button" className="w-full" size="lg" onClick={() => supabase.auth.signOut()}>
              Keluar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Berhasil masuk.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/30 p-4">
      <div className="w-full max-w-sm animate-card-in">
        <Card className="border border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-3 px-8 pb-2 pt-8 text-center">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold leading-snug tracking-tight">{APP_DISPLAY_NAME}</CardTitle>
              <CardDescription>Masuk dengan email dan kata sandi</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8 pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@contoh.com"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Kata sandi</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-0 top-0 flex h-full items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memuat…
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
