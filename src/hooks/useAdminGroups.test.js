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
  supabase: { rpc: () => chain },
}))

import { useAdminGroups } from './useAdminGroups'

describe('useAdminGroups', () => {
  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('returns data from admin_list_groups RPC', async () => {
    const mockGroups = [
      { id: 'g1', nama: 'Kelompok A', ahli_gizi_nama: 'Dr. Budi', member_count: 5 },
      { id: 'g2', nama: 'Kelompok B', ahli_gizi_nama: 'Dr. Siti', member_count: 3 },
    ]
    resultRef.current = { data: mockGroups, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useAdminGroups(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockGroups)
  })
})
