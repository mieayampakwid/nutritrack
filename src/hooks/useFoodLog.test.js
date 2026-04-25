import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/queryWrapper'

const { resultRef, chain } = vi.hoisted(() => {
  const resultRef = { current: { data: [], error: null } }
  const target = {}
  const proxied = new Proxy(target, {
    get(t, prop) {
      if (prop === 'then') return (resolve) => resolve(resultRef.current)
      if (!t[prop]) t[prop] = vi.fn().mockReturnValue(proxied)
      return t[prop]
    },
  })
  return { resultRef, chain: proxied }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: () => chain },
}))

// Static import — mock is hoisted before this runs
import { useFoodLogsForUser, useFoodLogItems } from './useFoodLog'

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
  it('is disabled when logIds is empty', async () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useFoodLogItems([]), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })
})
