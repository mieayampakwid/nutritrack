import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { AppShellLoadingSkeleton } from '@/components/shared/AppShellLoadingSkeleton'
import laperLogo from '@/assets/laper-logo.png'

export function ApprovalPendingPage() {
  const { loading, session, signOut } = useAuth()
  const navigate = useNavigate()

  if (loading || !session) return <AppShellLoadingSkeleton />

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-hero-split-bg app-hero-split-bg--full flex min-h-dvh flex-col items-center justify-center overflow-y-auto px-4 py-6">
      <div className="flex w-full max-w-lg flex-col gap-3 sm:max-w-xl">
        <div className="flex w-full flex-col items-center px-1">
          <img
            src={laperLogo}
            alt="LAPER"
            className="block h-auto w-full max-w-56 object-contain sm:max-w-62"
            width={400}
            height={100}
            decoding="async"
          />
        </div>
        <div className="animate-card-in">
          <Card className="overflow-hidden rounded-xl border border-border/55 bg-card/95 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.18)]">
            <CardContent className="flex flex-col items-center gap-4 px-8 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <ShieldCheck className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-lg font-bold tracking-tight">Menunggu Persetujuan Admin</h1>
                <p className="text-sm text-muted-foreground">
                  Akun kamu telah dibuat dan email sudah dikonfirmasi. Saat ini menunggu admin untuk
                  mengaktifkan akun kamu. Kamu akan bisa masuk setelah akun disetujui.
                </p>
              </div>
              <Button variant="outline" onClick={handleLogout} className="mt-2">
                Keluar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
