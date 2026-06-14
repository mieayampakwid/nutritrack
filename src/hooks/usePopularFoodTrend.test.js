import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/queryWrapper'

const { callResults, chain } = vi.hoisted(() => {
  const callResults = { current: [] }
  const target = {}
  const proxied = new Proxy(target, {
    get(t, prop) {
      if (prop === 'then') {
        return (resolve) => {
          const next = callResults.current.shift()
          resolve(next ?? { data: [], error: null })
        }
      }
      if (!t[prop]) t[prop] = vi.fn().mockReturnValue(proxied)
      return t[prop]
    },
  })
  return { callResults, chain: proxied }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: () => chain },
}))

import { usePopularFoodTrend } from './usePopularFoodTrend'

describe('usePopularFoodTrend', () => {
  afterEach(() => {
    callResults.current = []
  })

  it('returns empty chartData when no logs exist', async () => {
    callResults.current = [{ data: [], error: null }]

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => usePopularFoodTrend('7d'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.chartData).toEqual([])
    expect(result.current.data.hasData).toBe(false)
  })

  it('computes frequency from food_log_items', async () => {
    const logs = [
      { id: 'log-1', tanggal: '2025-06-14' },
      { id: 'log-2', tanggal: '2025-06-13' },
    ]
    const items = [
      { nama_makanan: 'Nasi Goreng', food_log_id: 'log-1' },
      { nama_makanan: 'nasi goreng', food_log_id: 'log-2' },
      { nama_makanan: 'Es Teh', food_log_id: 'log-1' },
    ]

    callResults.current = [
      { data: logs, error: null },
      { data: items, error: null },
    ]

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => usePopularFoodTrend('7d'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { chartData, hasData } = result.current.data

    expect(hasData).toBe(true)
    const nasiGoreng = chartData.find((d) => d.food.toLowerCase() === 'nasi goreng')
    expect(nasiGoreng).toBeDefined()
    expect(nasiGoreng.frekuensi).toBe(2)
  })
})
