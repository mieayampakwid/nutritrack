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

import { useUserEvaluations } from './useUserEvaluations'

describe('useUserEvaluations', () => {
  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('returns data from supabase', async () => {
    const mockEvals = [
      { id: '1', user_id: 'u1', date_to: '2025-06-14', bmi: 23.5 },
      { id: '2', user_id: 'u1', date_to: '2025-06-07', bmi: 24.1 },
    ]
    resultRef.current = { data: mockEvals, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useUserEvaluations('u1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockEvals)
  })

  it('is disabled when userId is empty', async () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useUserEvaluations(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })
})
