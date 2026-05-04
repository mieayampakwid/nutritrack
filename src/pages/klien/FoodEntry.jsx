import { AppShell } from '@/components/layout/AppShell'
import { FoodEntryForm } from '@/components/food/FoodEntryForm'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

export function FoodEntry() {
  const { profile } = useAuth()
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-3 pb-1 sm:space-y-4">
        <header className="space-y-2 text-center">
          <h1 className="text-center text-lg font-semibold tracking-tight text-white sm:text-xl">
            Catat makanan harian
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-white/85 max-md:drop-shadow-[0_1px_3px_rgba(0,0,0,0.28)]">
            Pilih waktu makan, tulis item dan porsinya, lalu biarkan AI menghitung estimasi kalori sebelum
            disimpan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
            <Badge
              variant="secondary"
              className="border-white/18 bg-white/12 text-[11px] font-semibold tracking-wide text-white shadow-sm backdrop-blur"
            >
              1) Waktu makan
            </Badge>
            <span className="text-white/55" aria-hidden>
              →
            </span>
            <Badge
              variant="secondary"
              className="border-white/18 bg-white/12 text-[11px] font-semibold tracking-wide text-white shadow-sm backdrop-blur"
            >
              2) Item & porsi
            </Badge>
            <span className="text-white/55" aria-hidden>
              →
            </span>
            <Badge
              variant="secondary"
              className="border-white/18 bg-white/12 text-[11px] font-semibold tracking-wide text-white shadow-sm backdrop-blur"
            >
              3) Analisa & simpan
            </Badge>
          </div>
        </header>
        {profile?.id ? (
          <Card
            className={cn(
              'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-75 motion-safe:fill-mode-both',
              'relative overflow-hidden p-4 shadow-sm sm:p-5',
              'border-border/70 bg-white/90 text-neutral-900 ring-1 ring-black/5 backdrop-blur-sm',
              'max-md:shadow-md md:shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_18px_48px_-18px_rgba(0,0,0,0.22)]',
              MOBILE_DASHBOARD_CARD_SHELL,
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-primary/12 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl"
              aria-hidden
            />
            <div className="relative">
              <FoodEntryForm userId={profile.id} />
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  )
}
