import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper } from '@/test/queryWrapper'

const { resultRef, chain } = vi.hoisted(() => {
  const resultRef = { current: { data: null, error: null } }
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

import { useMyGroup } from './useMyGroup'

describe('useMyGroup', () => {
  afterEach(() => {
    resultRef.current = { data: null, error: null }
  })

  it('returns group data from get_my_group RPC', async () => {
    const mockGroup = {
      id: 'g1',
      nama: 'Kelompok A',
      members: [
        { id: 'm1', klien_nama: 'Client 1', klien_email: 'client1@test.com' },
        { id: 'm2', klien_nama: 'Client 2', klien_email: 'client2@test.com' },
      ],
    }
    resultRef.current = { data: mockGroup, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMyGroup(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockGroup)
  })

  it('returns null when no group assigned', async () => {
    resultRef.current = { data: null, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMyGroup(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})
