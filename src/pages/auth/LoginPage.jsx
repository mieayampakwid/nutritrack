import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { AdBannerCarousel } from '@/components/dashboard/AdBannerCarousel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { getLoginGreetingTemplate } from '@/lib/dashboardGreeting'
import { APP_ACRONYM, APP_DISPLAY_NAME, APP_TAGLINE } from '@/lib/appMeta'
import { cn } from '@/lib/utils'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { loginSchema } from '@/lib/validators'
import laperLogo from '@/assets/laper-logo.png'

function dashboardPath(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'ahli_gizi') return '/gizi/dashboard'
  return '/klien/dashboard'
}

function LoginLogoBlock() {
  const year = new Date().getFullYear()
  return (
    <div className="flex w-full flex-col items-center px-1">
      <img
        src={laperLogo}
        alt={`${APP_ACRONYM} — ${APP_TAGLINE}`}
        className="block h-auto w-full max-w-56 object-contain sm:max-w-62"
        width={400}
        height={100}
        decoding="async"
      />
      <p className="m-0 max-w-[min(100%,20rem)] text-center text-[0.6875rem] leading-tight text-white sm:text-xs">
        © {year} PKRS RSUD RT Notopuro
      </p>
    </div>
  )
}

function LoginGreetingCard() {
  const greetingText = getLoginGreetingTemplate()

  return (
    <div className="w-full">
      <div
        className={cn(
          'relative z-10 overflow-hidden rounded-xl border border-amber-200/90 bg-linear-to-br from-amber-50 via-yellow-50 to-amber-100/95',
          'px-2.5 py-2 text-left shadow-[0_2px_16px_-6px_hsl(38_60%_30%/0.12)]',
          'ring-1 ring-inset ring-amber-100/90 backdrop-blur-md',
          'after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:z-1 after:h-[3px] after:bg-linear-to-b after:from-amber-100/95 after:to-amber-100',
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgb(254_252_232/0.9),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-2 left-0 top-2 w-px rounded-full bg-linear-to-b from-transparent via-amber-400/55 to-transparent shadow-[2px_0_10px_hsl(38_70%_40%/0.12)]"
          aria-hidden
        />
        <p
          className={cn(
            'relative pl-1.5 font-greeting text-[0.875rem] font-medium leading-snug text-amber-950 sm:text-[0.9375rem]',
          )}
        >
          {greetingText}
        </p>
      </div>
    </div>
  )
}

function LoginPageChrome({ children }) {
  return (
    <div className="app-hero-split-bg app-hero-split-bg--full flex min-h-dvh flex-col items-center justify-center overflow-y-auto px-4 py-6">
      <div className="flex w-full max-w-lg flex-col gap-3 sm:max-w-xl">
        <LoginLogoBlock />
        {children}
      </div>
    </div>
  )
}

export function LoginPage() {
  const { session, profile, loading, profileLoadError } = useAuth()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failCount, setFailCount] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (!lockedUntil || Date.now() >= lockedUntil) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      setCountdown(remaining)
      if (remaining <= 0) setLockedUntil(null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockedUntil])

  const isLocked = Boolean(lockedUntil) && countdown > 0

  function getLockoutDuration(failures) {
    if (failures < 5) return 0
    const base = 30_000
    const multiplier = Math.min(Math.pow(2, Math.floor((failures - 5) / 5)), 10)
    return Math.min(base * multiplier, 5 * 60_000)
  }

  if (!isSupabaseConfigured()) {
    return (
      <LoginPageChrome>
        <>
          <Card className="animate-card-in border border-border/50 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-2 pb-2 pt-8 text-center">
              <CardTitle className="text-lg font-bold leading-snug tracking-tight">{APP_DISPLAY_NAME}</CardTitle>
              <CardDescription>
                Salin <code className="text-xs">.env.example</code> ke <code className="text-xs">.env</code> dan isi URL
                serta anon key Supabase. Muat ulang server setelah mengubah <code className="text-xs">.env</code>.
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="mt-3 w-full max-w-none">
            <AdBannerCarousel className="mt-0" />
          </div>
        </>
      </LoginPageChrome>
    )
  }

  if (loading) {
    return (
      <LoginPageChrome>
        <>
          <div className="flex min-h-48 items-center justify-center rounded-xl border border-border/50 bg-card/80 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Memuat" />
          </div>
          <div className="mt-3 w-full max-w-none">
            <AdBannerCarousel className="mt-0" />
          </div>
        </>
      </LoginPageChrome>
    )
  }

  if (session && profile && profile.is_active !== false) {
    const to = loc.state?.from?.pathname ?? dashboardPath(profile.role)
    return <Navigate to={to} replace />
  }

  if (session && profile && profile.is_active === false) {
    return <Navigate to="/menunggu-persetujuan" replace />
  }

  if (session && !loading && !profile) {
    return (
      <LoginPageChrome>
        <>
          <Card className="animate-card-in border border-border/50 shadow-xl shadow-primary/5">
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
          <div className="mt-3 w-full max-w-none">
            <AdBannerCarousel className="mt-0" />
          </div>
        </>
      </LoginPageChrome>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isLocked) return
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      const newCount = failCount + 1
      setFailCount(newCount)
      const lockMs = getLockoutDuration(newCount)
      if (lockMs > 0) setLockedUntil(Date.now() + lockMs)
      toast.error(error.message)
    } else {
      setFailCount(0)
      setLockedUntil(null)
    }
  }

  const loginInputClass =
    'h-8 border-border/70 bg-background/80 px-2.5 py-1 text-sm shadow-sm placeholder:text-muted-foreground/80 file:text-sm focus-visible:ring-1 focus-visible:ring-offset-0'

  return (
    <LoginPageChrome>
      <>
        <div className="animate-card-in">
          <Card className="overflow-hidden rounded-xl border border-border/55 bg-card/95 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.18)] ring-1 ring-black/3 dark:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.45)] dark:ring-white/6">
            <CardContent className="px-4 pb-5 pt-3 sm:px-5">
              <div className="space-y-2.5">
                <LoginGreetingCard />
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@contoh.com"
                      className={cn(loginInputClass, 'placeholder:text-[0.6875rem] placeholder:leading-normal')}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                      Kata sandi
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn(loginInputClass, 'pr-9')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-0 top-0 flex h-full items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="mt-1 w-full text-sm font-semibold" disabled={busy || isLocked}>
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Memuat…
                      </>
                    ) : (
                      'Masuk'
                    )}
                  </Button>
                  {isLocked && countdown > 0 && (
                    <p className="text-center text-xs text-destructive">
                      Terlalu banyak percobaan. Coba lagi dalam {countdown} detik.
                    </p>
                  )}
                </form>
                <p className="text-center text-xs text-muted-foreground">
                  Belum punya akun?{' '}
                  <Link to="/register" className="font-medium text-primary hover:underline">
                    Daftar
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-3 w-full max-w-none">
          <AdBannerCarousel className="mt-0" />
        </div>
      </>
    </LoginPageChrome>
  )
}
