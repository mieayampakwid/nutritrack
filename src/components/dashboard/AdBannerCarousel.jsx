import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { AD_BANNER_INTERVAL_MS, AD_BANNER_SLIDES } from '@/config/adBanners'
import { cn } from '@/lib/utils'

function getDismissKey(userId) {
  return `ad-dismissed-${userId}`
}

export function AdBannerCarousel({
  slides = AD_BANNER_SLIDES,
  intervalMs = AD_BANNER_INTERVAL_MS,
  className,
  dismissible = false,
  userId,
}) {
  const [index, setIndex] = useState(0)
  const [hoverPause, setHoverPause] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissible || !userId) return false
    return sessionStorage.getItem(getDismissKey(userId)) === '1'
  })
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const count = slides?.length ?? 0
  const active = count === 0 ? 0 : index % count
  const autoPaused = hoverPause || tabHidden

  const advance = useCallback(() => {
    if (count <= 1) return
    setIndex((i) => (i + 1) % count)
  }, [count])

  useEffect(() => {
    if (count <= 1 || autoPaused) return
    const ms = reduceMotion ? Math.max(intervalMs, 12_000) : intervalMs
    const id = window.setInterval(advance, ms)
    return () => window.clearInterval(id)
  }, [advance, count, intervalMs, autoPaused, active, reduceMotion])

  useEffect(() => {
    const onVis = () => setTabHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    onVis()
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const handleDismiss = () => {
    if (userId) sessionStorage.setItem(getDismissKey(userId), '1')
    setDismissed(true)
  }

  if (dismissed || !slides?.length) return null

  const transitionClass = reduceMotion ? 'duration-0' : 'duration-500 ease-out'

  return (
    <div
      className={cn('relative mx-auto mt-3 w-full max-w-3xl px-0 sm:px-1', className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Iklan"
      onMouseEnter={() => setHoverPause(true)}
      onMouseLeave={() => setHoverPause(false)}
    >
      <div className="relative w-full overflow-hidden rounded-xl">
        <div
          className={cn('flex w-full items-start', transitionClass, 'transition-transform')}
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide) => (
            <Slide key={slide.id} slide={slide} />
          ))}
        </div>
        {dismissible ? (
          <button
            onClick={handleDismiss}
            className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
            aria-label="Tutup iklan"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

const slideBasis = 'block w-full min-w-0 shrink-0 basis-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

function Slide({ slide }) {
  if (slide.href) {
    return (
      <a href={slide.href} className={slideBasis} target="_blank" rel="noopener noreferrer">
        {slide.imageSrc ? (
          <img
            src={slide.imageSrc}
            alt={slide.alt}
            className="block w-full max-w-full h-auto align-middle"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className={cn(
              'flex min-h-32 w-full items-center justify-center px-6 py-10 text-center text-sm font-medium sm:text-base',
              slide.className ?? 'bg-muted text-muted-foreground',
            )}
          >
            <span className="max-w-md leading-snug opacity-95">{slide.alt}</span>
          </div>
        )}
      </a>
    )
  }

  if (slide.imageSrc) {
    return (
      <div className={slideBasis}>
        <img
          src={slide.imageSrc}
          alt={slide.alt}
          className="block w-full max-w-full h-auto align-middle"
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div className={slideBasis} role="img" aria-label={slide.alt}>
      <div
        className={cn(
          'flex min-h-32 w-full items-center justify-center px-6 py-10 text-center text-sm font-medium sm:text-base',
          slide.className ?? 'bg-muted text-muted-foreground',
        )}
      >
        <span className="max-w-md leading-snug opacity-95">{slide.alt}</span>
      </div>
    </div>
  )
}
