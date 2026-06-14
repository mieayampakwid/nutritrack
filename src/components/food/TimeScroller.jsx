import { useEffect, useRef, useState, useCallback } from 'react'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function vibrate(ms = 10) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // silently ignore — iOS, desktop, or non-secure context
  }
}

function generateRange(min, max) {
  const arr = []
  for (let i = min; i <= max; i++) {
    arr.push(i)
  }
  return arr
}

const STEPPER_BTN =
  'flex h-8 w-12 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'

const NUMBER_TRIGGER =
  'flex h-11 min-h-[44px] w-16 items-center justify-center rounded-md border border-input bg-background/80 text-lg font-mono font-semibold tabular-nums shadow-sm transition-[color,box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-10 md:min-h-0 md:w-14 md:text-base'

const SCROLLER_ITEM =
  'flex h-12 w-full items-center justify-center rounded-lg text-lg font-mono tabular-nums transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'

export function TimeScroller({ min, max, padLength = 2, value, onChange, ariaLabel }) {
  const reduceMotion = useReducedMotion()
  const listRef = useRef(null)
  const currentRef = useRef(null)
  const [open, setOpen] = useState(false)

  const range = generateRange(min, max)

  const display =
    value === '' || value == null
      ? '--'
      : String(value).padStart(padLength, '0')

  const numeric = value === '' || value == null ? 0 : parseInt(String(value), 10) || 0

  const step = useCallback(
    (delta) => {
      let next = numeric + delta
      if (next > max) next = min
      if (next < min) next = max
      onChange(String(next).padStart(padLength, '0'))
      vibrate(10)
    },
    [numeric, min, max, padLength, onChange],
  )

  const select = useCallback(
    (n) => {
      onChange(String(n).padStart(padLength, '0'))
      setOpen(false)
      vibrate(15)
    },
    [padLength, onChange],
  )

  // Auto-scroll to current value when opened
  useEffect(() => {
    if (!open || !currentRef.current) return
    const raf = requestAnimationFrame(() => {
      currentRef.current?.scrollIntoView({
        block: 'center',
        behavior: reduceMotion ? 'instant' : 'smooth',
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [open, numeric, reduceMotion])

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Increment stepper */}
      <button
        type="button"
        className={STEPPER_BTN}
        onClick={() => step(1)}
        aria-label={`Tambah ${ariaLabel}`}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>

      {/* Number display → opens scroller */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={NUMBER_TRIGGER}
            aria-label={ariaLabel}
          >
            {display}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-28 p-0"
          align="center"
          sideOffset={8}
        >
          <div className="flex flex-col">
            <div
              ref={listRef}
              className="max-h-64 overflow-y-auto overscroll-contain scroll-smooth py-2"
            >
              <div className="h-[calc(50%-1.5rem)]" aria-hidden />
              {range.map((n) => {
                const isCurrent = n === numeric
                const label = String(n).padStart(padLength, '0')
                return (
                  <button
                    key={n}
                    ref={isCurrent ? currentRef : null}
                    type="button"
                    className={cn(
                      SCROLLER_ITEM,
                      isCurrent && 'bg-primary/10 font-bold text-primary',
                    )}
                    onClick={() => select(n)}
                  >
                    {label}
                  </button>
                )
              })}
              <div className="h-[calc(50%-1.5rem)]" aria-hidden />
            </div>
            <div className="border-t border-border/60 px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Decrement stepper */}
      <button
        type="button"
        className={STEPPER_BTN}
        onClick={() => step(-1)}
        aria-label={`Kurangi ${ariaLabel}`}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
