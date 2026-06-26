import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createQueryWrapper } from '@/test/queryWrapper'

const { resultRef, chain, fromSpy } = vi.hoisted(() => {
  const resultRef = { current: { data: [], error: null } }
  const fromSpy = vi.fn()
  const target = {}
  const proxied = new Proxy(target, {
    get(t, prop) {
      if (prop === 'then') return (resolve) => resolve(resultRef.current)
      if (!t[prop]) t[prop] = vi.fn().mockReturnValue(proxied)
      return t[prop]
    },
  })
  fromSpy.mockReturnValue(proxied)
  return { resultRef, chain: proxied, fromSpy }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: fromSpy },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useWaterIntakeByDate, useAddWaterIntake, useDeleteWaterIntake } from './useWaterIntake'
import { toast } from 'sonner'

describe('useWaterIntakeByDate', () => {
  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('returns data from supabase', async () => {
    const mockIntakes = [
      { id: 'w1', user_id: 'u1', tanggal: '2026-06-25', volume_ml: 300, created_at: '2026-06-25T08:00:00Z' },
      { id: 'w2', user_id: 'u1', tanggal: '2026-06-25', volume_ml: 500, created_at: '2026-06-25T12:00:00Z' },
    ]
    resultRef.current = { data: mockIntakes, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useWaterIntakeByDate('u1', '2026-06-25'),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockIntakes)
  })

  it('is disabled when userId is empty', async () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useWaterIntakeByDate('', '2026-06-25'),
      { wrapper },
    )

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('is disabled when tanggal is empty', async () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useWaterIntakeByDate('u1', ''),
      { wrapper },
    )

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useAddWaterIntake', () => {
  let wrapper
  let queryClient

  beforeEach(() => {
    const created = createQueryWrapper()
    wrapper = created.wrapper
    queryClient = created.queryClient
    resultRef.current = { data: null, error: null }
    vi.clearAllMocks()
  })

  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('inserts water intake and invalidates query', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    resultRef.current = { data: { id: 'w1' }, error: null }

    const { result } = renderHook(() => useAddWaterIntake(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ userId: 'u1', tanggal: '2026-06-25', volumeMl: 300 })
    })

    expect(fromSpy).toHaveBeenCalledWith('water_intakes')
    expect(chain.insert).toHaveBeenCalledWith({ user_id: 'u1', tanggal: '2026-06-25', volume_ml: 300 })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['water_intakes', 'u1', '2026-06-25'] })
    expect(toast.success).toHaveBeenCalledWith('Asupan air tercatat.')
  })

  it('shows error toast when insert fails', async () => {
    resultRef.current = { data: null, error: { message: 'Check violation' } }

    const { result } = renderHook(() => useAddWaterIntake(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({ userId: 'u1', tanggal: '2026-06-25', volumeMl: 300 })
      } catch {
        // expected
      }
    })

    expect(toast.error).toHaveBeenCalledWith('Check violation')
  })
})

describe('useDeleteWaterIntake', () => {
  let wrapper
  let queryClient

  beforeEach(() => {
    const created = createQueryWrapper()
    wrapper = created.wrapper
    queryClient = created.queryClient
    resultRef.current = { data: null, error: null }
    vi.clearAllMocks()
  })

  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('audits then deletes water intake', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    resultRef.current = { data: null, error: null }

    const { result } = renderHook(() => useDeleteWaterIntake(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        intakeId: 'w1',
        userId: 'u1',
        volumeMl: 300,
        tanggal: '2026-06-25',
        createdAt: '2026-06-25T08:00:00Z',
      })
    })

    expect(fromSpy).toHaveBeenCalledWith('water_intake_deletions')
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      water_intake_id: 'w1',
      volume_ml: 300,
      tanggal: '2026-06-25',
      created_at: '2026-06-25T08:00:00Z',
    })
    expect(fromSpy).toHaveBeenCalledWith('water_intakes')
    expect(chain.delete).toHaveBeenCalled()

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['water_intakes', 'u1', '2026-06-25'] })
    expect(toast.success).toHaveBeenCalledWith('Entri asupan air dihapus.')
  })

  it('shows error toast when deletion fails', async () => {
    resultRef.current = { data: null, error: { message: 'RLS violation' } }

    const { result } = renderHook(() => useDeleteWaterIntake(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          intakeId: 'w1',
          userId: 'u1',
          volumeMl: 300,
          tanggal: '2026-06-25',
          createdAt: '2026-06-25T08:00:00Z',
        })
      } catch {
        // expected
      }
    })

    expect(toast.error).toHaveBeenCalledWith('RLS violation')
  })
})
