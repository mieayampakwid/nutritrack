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

import { useMeasurements } from './useMeasurement'

describe('useMeasurements', () => {
  afterEach(() => {
    resultRef.current = { data: [], error: null }
    vi.clearAllMocks()
  })

  it('returns data from supabase', async () => {
    const mockData = [
      { id: '1', user_id: 'u1', tanggal: '2025-06-14', berat_badan: 70, tinggi_badan: 170 },
    ]
    resultRef.current = { data: mockData, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMeasurements('u1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockData)
  })

  it('is disabled when userId is empty', async () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMeasurements(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('passes dateFrom / dateTo to supabase query when provided', async () => {
    const mockData = [
      { id: '2', user_id: 'u1', tanggal: '2026-05-05', berat_badan: 71 },
    ]
    resultRef.current = { data: mockData, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useMeasurements('u1', { dateFrom: '2026-05-01', dateTo: '2026-05-09' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chain.gte).toHaveBeenCalledWith('tanggal', '2026-05-01')
    expect(chain.lte).toHaveBeenCalledWith('tanggal', '2026-05-09')
    expect(result.current.data).toEqual(mockData)
  })

  it('does not add date filters when dateFrom/dateTo are not provided', async () => {
    const mockData = [{ id: '3', user_id: 'u1', tanggal: '2026-05-05', berat_badan: 71 }]
    resultRef.current = { data: mockData, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useMeasurements('u1', { enabled: true }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chain.gte).not.toHaveBeenCalled()
    expect(chain.lte).not.toHaveBeenCalled()
    expect(result.current.data).toEqual(mockData)
  })

  it('remains backward compatible with boolean second argument', async () => {
    const mockData = [{ id: '4', user_id: 'u1', tanggal: '2026-05-05', berat_badan: 71 }]
    resultRef.current = { data: mockData, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMeasurements('u1', true), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockData)
  })
})
