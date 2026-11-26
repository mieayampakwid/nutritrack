import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_ACRONYM, APP_TAGLINE } from '@/lib/appMeta'
import laperLogo from '@/assets/laper-logo.png'

/** Kerangka halaman autentikasi sederhana (logo + kartu) untuk halaman sandi. */
export function AuthPageShell({ title, description, children }) {
  return (
    <div className="app-hero-split-bg app-hero-split-bg--full flex min-h-dvh flex-col items-center justify-center overflow-y-auto px-4 py-6">
      <div className="flex w-full max-w-lg flex-col gap-3 sm:max-w-xl">
        <div className="flex w-full flex-col items-center px-1">
          <img
            src={laperLogo}
            alt={`${APP_ACRONYM} — ${APP_TAGLINE}`}
            className="block h-auto w-full max-w-56 object-contain sm:max-w-62"
            width={400}
            height={100}
            decoding="async"
          />
        </div>
        <Card className="animate-card-in overflow-hidden rounded-xl border border-border/55 bg-card/95 shadow-xl">
          <CardHeader className="space-y-1 pb-2 pt-5 text-center">
            <CardTitle className="text-lg font-bold tracking-tight">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="px-4 pb-5 sm:px-5">{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}
