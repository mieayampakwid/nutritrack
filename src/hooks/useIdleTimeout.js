import { useEffect, useRef } from 'react'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const WARNING_BEFORE_MS = 2 * 60 * 1000

export function useIdleTimeout({ onWarning, onTimeout, enabled = true }) {
  const lastActivity = useRef(0)
  const warningFired = useRef(false)

  useEffect(() => {
    if (!enabled) return
    lastActivity.current = Date.now()
    warningFired.current = false

    function resetTimer() {
      lastActivity.current = Date.now()
      warningFired.current = false
    }

    const events = ['mousemove', 'keydown', 'touchstart', 'pointerdown', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))

    function handleVisibility() {
      if (document.visibilityState === 'visible') resetTimer()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current
      if (elapsed >= IDLE_TIMEOUT_MS) {
        onTimeout()
      } else if (elapsed >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS && !warningFired.current) {
        warningFired.current = true
        onWarning()
      }
    }, 15_000)

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [enabled, onWarning, onTimeout])
}
