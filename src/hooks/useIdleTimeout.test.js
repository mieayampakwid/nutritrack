import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIdleTimeout } from './useIdleTimeout'

describe('useIdleTimeout', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onWarning 2 minutes before timeout', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onWarning = vi.fn()
    const onTimeout = vi.fn()

    renderHook(() =>
      useIdleTimeout({ onWarning, onTimeout, enabled: true }),
    )

    // The hook checks every 15s. Warning fires at 28 min (30 min - 2 min).
    // Advance past 28 min + one check interval
    vi.advanceTimersByTime(28 * 60 * 1000 + 16_000)

    expect(onWarning).toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('calls onTimeout after full idle period', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onWarning = vi.fn()
    const onTimeout = vi.fn()

    renderHook(() =>
      useIdleTimeout({ onWarning, onTimeout, enabled: true }),
    )

    vi.advanceTimersByTime(30 * 60 * 1000 + 16_000)

    expect(onTimeout).toHaveBeenCalled()
  })

  it('does not start timers when disabled', () => {
    vi.useFakeTimers()
    const onWarning = vi.fn()
    const onTimeout = vi.fn()

    renderHook(() =>
      useIdleTimeout({ onWarning, onTimeout, enabled: false }),
    )

    vi.advanceTimersByTime(60 * 60 * 1000)

    expect(onWarning).not.toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('resets warning on user activity', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onWarning = vi.fn()

    renderHook(() =>
      useIdleTimeout({ onWarning, onTimeout: vi.fn(), enabled: true }),
    )

    // Advance 20 min, fire activity, then advance 20 more
    vi.advanceTimersByTime(20 * 60 * 1000)
    window.dispatchEvent(new Event('mousemove'))

    // At 28 min from start (8 min after reset), warning should not have fired yet
    vi.advanceTimersByTime(8 * 60 * 1000 + 16_000)
    // Since we reset at 20 min, warning fires at 48 min total (20 + 28)
    expect(onWarning).not.toHaveBeenCalled()

    // Advance to 48+ min total (28 min after reset)
    vi.advanceTimersByTime(20 * 60 * 1000 + 16_000)
    expect(onWarning).toHaveBeenCalled()
  })
})
