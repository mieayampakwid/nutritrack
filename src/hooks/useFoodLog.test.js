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

// Static import — mock is hoisted before this runs
import { useFoodLogsForUser, useFoodLogItems, useDeleteFoodLog } from './useFoodLog'
import { toast } from 'sonner'

describe('useFoodLogsForUser', () => {
  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('returns data from supabase', async () => {
    const mockLogs = [
      { id: '1', user_id: 'u1', tanggal: '2025-06-14', waktu_makan: 'pagi', total_kalori: 500 },
      { id: '2', user_id: 'u1', tanggal: '2025-06-13', waktu_makan: 'siang', total_kalori: 600 },
    ]
    resultRef.current = { data: mockLogs, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useFoodLogsForUser('u1', { dateFrom: '2025-06-01', dateTo: '2025-06-14' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockLogs)
  })

  it('is disabled when userId is empty', async () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useFoodLogsForUser('', { dateFrom: '2025-06-01', dateTo: '2025-06-14' }),
      { wrapper },
    )

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useFoodLogItems', () => {
  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('is disabled when logIds is empty', async () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useFoodLogItems([]), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('returns items for given logIds', async () => {
    const mockItems = [
      { id: 'i1', food_log_id: 'l1', nama_makanan: 'Nasi goreng', jumlah: 1, unit_nama: 'piring', kalori_estimasi: 400 },
    ]
    resultRef.current = { data: mockItems, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useFoodLogItems(['l1']), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockItems)
  })
})

describe('useDeleteFoodLog', () => {
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

  it('deletes food log and logs to food_log_deletions', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    resultRef.current = { data: null, error: null }

    const { result } = renderHook(() => useDeleteFoodLog(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ logId: 'l1', userId: 'u1', foodName: 'Nasi goreng' })
    })

    expect(fromSpy).toHaveBeenCalledWith('food_log_deletions')
    expect(chain.insert).toHaveBeenCalledWith({ user_id: 'u1', food_log_id: 'l1', food_name: 'Nasi goreng' })
    expect(fromSpy).toHaveBeenCalledWith('food_logs')
    expect(chain.delete).toHaveBeenCalled()

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['food_logs', 'u1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['food_entry_dates'] })
    expect(toast.success).toHaveBeenCalledWith('Entri log berhasil dihapus.')
  })

  it('shows error toast when deletion fails', async () => {
    resultRef.current = { data: null, error: { message: 'RLS violation' } }

    const { result } = renderHook(() => useDeleteFoodLog(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({ logId: 'l1', userId: 'u1', foodName: 'Nasi goreng' })
      } catch {
        // expected
      }
    })

    expect(toast.error).toHaveBeenCalledWith('RLS violation')
  })
})
