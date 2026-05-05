import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import laperLogo from '@/assets/laper-logo.png'
import { useAuth } from '@/hooks/useAuth'
import {
  formatClockWib,
  getDashboardGreetingTemplate,
  splitGreetingAtClock,
} from '@/lib/dashboardGreeting'
import { AdBannerCarousel } from '@/components/dashboard/AdBannerCarousel'
import { APP_ACRONYM, APP_TAGLINE } from '@/lib/appMeta'
import { profileDisplayName } from '@/lib/profileDisplay'
import { cn } from '@/lib/utils'

/**
 * @param {{ className?: string, bareOnMobile?: boolean, compactLogo?: boolean, bareLogoShell?: boolean }} props
 * Renders a fragment: logo block, sentinel, sticky greeting (direct child of `main` for CSS), ads.
 */
export function DashboardHero({
  className,
  bareOnMobile = false,
  compactLogo = false,
  bareLogoShell = false,
}) {
  const { profile } = useAuth()
  const displayName = profileDisplayName(profile)
  const [tick, setTick] = useState(0)
  const sentinelRef = useRef(null)
  const [greetingFloated, setGreetingFloated] = useState(false)

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

  /** Scroll sync: IntersectionObserver + 1px sentinels often report false on first paint → spurious “floated” + full-width bg. */
  useLayoutEffect(() => {
    const sentinel = sentinelRef.current
    const main = sentinel?.closest('main')
    if (!sentinel || !main) return

    const syncGreetingFloated = () => {
      const root = main.getBoundingClientRect()
      const s = sentinel.getBoundingClientRect()
      const floated = s.bottom < root.top + 0.5
      setGreetingFloated(floated)
    }

    syncGreetingFloated()
    main.addEventListener('scroll', syncGreetingFloated, { passive: true })
    window.addEventListener('resize', syncGreetingFloated)
    const ro = new ResizeObserver(() => syncGreetingFloated())
    ro.observe(main)
    return () => {
      main.removeEventListener('scroll', syncGreetingFloated)
      window.removeEventListener('resize', syncGreetingFloated)
      ro.disconnect()
    }
  }, [])

  void tick
  const now = new Date()
  const greetingTemplate = getDashboardGreetingTemplate(displayName, now)
  const { before, after, hasClock } = splitGreetingAtClock(greetingTemplate)

  const shellClass = bareLogoShell
    ? 'relative mb-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none'
    : bareOnMobile
      ? 'relative mb-0 max-md:overflow-visible max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none md:mb-0 md:overflow-hidden md:rounded-2xl md:border md:border-border/70 md:bg-gradient-to-br md:from-primary/[0.18] md:via-primary/[0.06] md:to-secondary/[0.16] md:p-7 md:shadow-sm lg:p-8'
      : 'relative mb-0 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.07] via-background to-secondary/[0.12] p-5 shadow-sm sm:p-6 md:p-7 lg:p-8'

  const glowClass = bareLogoShell ? 'hidden' : bareOnMobile ? 'max-md:hidden' : ''

  return (
    <>
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
                'h-auto w-full object-contain',
                compactLogo
                  ? 'max-w-[min(100%,14rem)] sm:max-w-sm md:max-w-md'
                  : 'max-w-[min(100%,22rem)] sm:max-w-md md:max-w-lg',
              )}
              width={640}
              height={160}
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />

      <div
        className={cn(
          'dashboard-sticky-greeting sticky top-0 -mx-3 w-[calc(100%+1.5rem)] max-w-none px-3 md:-mx-6 md:w-[calc(100%+3rem)] md:px-6 lg:-mx-8 lg:w-[calc(100%+4rem)] lg:px-8',
          'transition-[padding,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          !greetingFloated && 'mt-2.5 sm:mt-3',
          greetingFloated &&
            'py-1.5 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]',
        )}
      >
        <div className="relative z-10 mx-auto w-full max-w-[min(100%,22rem)] sm:max-w-lg md:max-w-xl lg:max-w-2xl">
          <div
            className={cn(
              /* -mb-px + hairline: mask 1px seam vs fixed hero bg under rounded corners (GPU compositing). */
              'relative z-10 -mb-px overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/95',
              'px-2.5 py-2.5 text-left shadow-[0_2px_20px_-6px_hsl(38_60%_30%_/_0.12)] md:px-4 md:py-3',
              'ring-1 ring-inset ring-amber-100/90 backdrop-blur-md',
              'after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:z-[1] after:h-[3px] after:bg-gradient-to-b after:from-amber-100/95 after:to-amber-100',
              '',
              '',
              'transition-[box-shadow,border-color,ring-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              greetingFloated &&
                'shadow-[0_12px_36px_-14px_hsl(38_55%_28%_/_0.2)] ring-amber-900/[0.06]',
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgb(254_252_232_/_0.9),transparent_55%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-2 left-0 top-2 w-px rounded-full bg-gradient-to-b from-transparent via-amber-400/55 to-transparent shadow-[2px_0_10px_hsl(38_70%_40%_/_0.12)]"
              aria-hidden
            />
            <p
              className={cn(
                'relative pl-2 font-greeting text-[0.9375rem] font-medium leading-snug text-amber-950',
                'sm:text-[1rem] md:text-[1.0625rem] md:leading-snug lg:text-lg lg:leading-snug',
              )}
            >
              {hasClock ? (
                <>
                  {before}
                  <time
                    dateTime={now.toISOString()}
                    className="mx-0.5 inline-flex translate-y-px items-baseline rounded-md border border-amber-300/90 bg-amber-100/95 px-1.5 py-px font-sans text-[0.8125rem] font-semibold tabular-nums tracking-normal text-amber-950 shadow-[inset_0_1px_0_hsl(48_100%_96%_/_0.95)] md:px-2 md:text-sm"
                  >
                    {formatClockWib(now)}
                  </time>
                  {after}
                </>
              ) : (
                greetingTemplate
              )}
            </p>
          </div>
        </div>
      </div>

      {profile?.role === 'klien' ? (
        <div className="mt-2 mb-2 sm:mb-3">
          <AdBannerCarousel />
        </div>
      ) : (
        <div className="mb-2 sm:mb-3" aria-hidden />
      )}
    </>
  )
}
