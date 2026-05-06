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

import { useExerciseLogsForUser } from './useExerciseLog'

describe('useExerciseLogsForUser', () => {
  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('returns data from supabase', async () => {
    const mockLogs = [
      { id: '1', user_id: 'u1', tanggal: '2026-05-06', jenis_olahraga: 'lari', durasi: '30 menit' },
      { id: '2', user_id: 'u1', tanggal: '2026-05-05', jenis_olahraga: 'sepeda', durasi: '45m' },
    ]
    resultRef.current = { data: mockLogs, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useExerciseLogsForUser('u1', { dateFrom: '2026-05-01', dateTo: '2026-05-06' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockLogs)
  })

  it('is disabled when userId is empty', async () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useExerciseLogsForUser('', { dateFrom: '2026-05-01', dateTo: '2026-05-06' }),
      { wrapper },
    )

    expect(result.current.fetchStatus).toBe('idle')
  })
})

