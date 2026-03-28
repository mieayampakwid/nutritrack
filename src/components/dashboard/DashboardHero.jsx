import { useEffect, useState } from 'react'
import laperLogo from '@/assets/laper-logo.png'
import { useAuth } from '@/hooks/useAuth'
import {
  formatClockGmt8,
  getDashboardGreetingTemplate,
  splitGreetingAtClock,
} from '@/lib/dashboardGreeting'
import { AdBannerCarousel } from '@/components/dashboard/AdBannerCarousel'
import { APP_ACRONYM, APP_TAGLINE } from '@/lib/appMeta'
import { profileDisplayName } from '@/lib/profileDisplay'
import { cn } from '@/lib/utils'

/**
 * @param {{ className?: string, bareOnMobile?: boolean, compactLogo?: boolean }} props
 */
export function DashboardHero({ className, bareOnMobile = false, compactLogo = false }) {
  const { profile } = useAuth()
  const displayName = profileDisplayName(profile)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    const onVis = () => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  void tick
  const now = new Date()
  const greetingTemplate = getDashboardGreetingTemplate(displayName, now)
  const { before, after, hasClock } = splitGreetingAtClock(greetingTemplate)

  const shellClass = bareOnMobile
    ? 'relative mb-2 max-md:overflow-visible max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none md:mb-3 md:overflow-hidden md:rounded-2xl md:border md:border-border/70 md:bg-gradient-to-br md:from-primary/[0.07] md:via-background md:to-secondary/[0.12] md:p-6 md:shadow-sm'
    : 'relative mb-2 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.07] via-background to-secondary/[0.12] p-5 shadow-sm sm:mb-3 sm:p-6'

  const glowClass = bareOnMobile ? 'max-md:hidden' : ''

  return (
    <div className={cn(shellClass, className)}>
      <div
        className={cn(
          'pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.06] blur-3xl',
          glowClass,
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-secondary/[0.08] blur-3xl',
          glowClass,
        )}
        aria-hidden
      />

      <div className="relative flex flex-col items-center gap-0 text-center">
        <div className="flex w-full justify-center px-1">
          <img
            src={laperLogo}
            alt={`${APP_ACRONYM} — ${APP_TAGLINE}`}
            className={cn(
              'h-auto w-full object-contain dark:brightness-0 dark:invert',
              compactLogo
                ? 'max-w-[min(100%,14rem)] sm:max-w-sm md:max-w-md'
                : 'max-w-[min(100%,22rem)] sm:max-w-md md:max-w-lg',
            )}
            width={640}
            height={160}
            decoding="async"
          />
        </div>
        <p className="max-w-full text-sm font-medium leading-relaxed text-foreground sm:max-w-lg sm:text-[0.95rem] md:max-w-xl">
          {hasClock ? (
            <>
              {before}
              <time
                dateTime={now.toISOString()}
                className="mx-0.5 inline tabular-nums tracking-tight text-foreground"
              >
                {formatClockGmt8(now)}
              </time>
              {after}
            </>
          ) : (
            greetingTemplate
          )}
        </p>
        <AdBannerCarousel />
      </div>
    </div>
  )
}
