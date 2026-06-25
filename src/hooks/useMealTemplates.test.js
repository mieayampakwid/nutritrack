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

import { useMealTemplates, useCreateMealTemplate, useDeleteMealTemplate } from './useMealTemplates'
import { toast } from 'sonner'

describe('useMealTemplates', () => {
  afterEach(() => {
    resultRef.current = { data: [], error: null }
  })

  it('is disabled when userId is empty', async () => {
    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMealTemplates(''), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('returns templates with embedded items', async () => {
    const mockTemplates = [
      {
        id: 't1',
        user_id: 'u1',
        nama: 'Nasi goreng (+2)',
        waktu_makan: 'pagi',
        meal_template_items: [
          { id: 'i1', meal_template_id: 't1', nama_makanan: 'Nasi goreng', jumlah: 1, unit_nama: 'piring', kalori_estimasi: 400 },
          { id: 'i2', meal_template_id: 't1', nama_makanan: 'Telur', jumlah: 2, unit_nama: 'butir', kalori_estimasi: 140 },
        ],
      },
    ]
    resultRef.current = { data: mockTemplates, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMealTemplates('u1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockTemplates)
    expect(result.current.data[0].meal_template_items).toHaveLength(2)
  })
})

describe('useCreateMealTemplate', () => {
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

  it('inserts parent then children and invalidates', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    // Parent insert (.select().single()) resolves with the new row
    resultRef.current = {
      data: { id: 't-new', nama: 'Sarapan', waktu_makan: 'pagi' },
      error: null,
    }

    const { result } = renderHook(() => useCreateMealTemplate(), { wrapper })

    const items = [
      { nama_makanan: 'Nasi goreng', jumlah: 1, unit_id: 'g1', unit_nama: 'gram', kalori_estimasi: 400 },
      { nama_makanan: 'Telur', jumlah: 2, unit_id: null, unit_nama: 'butir', kalori_estimasi: 140 },
    ]

    await act(async () => {
      await result.current.mutateAsync({ userId: 'u1', nama: 'Sarapan', waktu_makan: 'pagi', items })
    })

    expect(fromSpy).toHaveBeenCalledWith('meal_templates')
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      nama: 'Sarapan',
      waktu_makan: 'pagi',
    })
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()

    // Second from call for child insert
    expect(fromSpy).toHaveBeenCalledWith('meal_template_items')
    expect(chain.insert).toHaveBeenCalledWith([
      { meal_template_id: 't-new', nama_makanan: 'Nasi goreng', jumlah: 1, unit_id: 'g1', unit_nama: 'gram', kalori_estimasi: 400 },
      { meal_template_id: 't-new', nama_makanan: 'Telur', jumlah: 2, unit_id: null, unit_nama: 'butir', kalori_estimasi: 140 },
    ])

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['meal_templates', 'u1'] })
  })

  it('throws on parent insert error', async () => {
    resultRef.current = { data: null, error: { message: 'RLS violation' } }

    const { result } = renderHook(() => useCreateMealTemplate(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          userId: 'u1',
          nama: 'Sarapan',
          waktu_makan: 'pagi',
          items: [{ nama_makanan: 'Nasi', jumlah: 1, unit_id: null, unit_nama: 'piring', kalori_estimasi: 300 }],
        })
      } catch {
        // expected
      }
    })

    expect(fromSpy).toHaveBeenCalledWith('meal_templates')
    // Child insert should NOT have been called
    expect(fromSpy).not.toHaveBeenCalledWith('meal_template_items')
  })
})

describe('useDeleteMealTemplate', () => {
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

  it('deletes template and shows success toast', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    resultRef.current = { data: null, error: null }

    const { result } = renderHook(() => useDeleteMealTemplate(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ templateId: 't1', userId: 'u1' })
    })

    expect(fromSpy).toHaveBeenCalledWith('meal_templates')
    expect(chain.delete).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['meal_templates', 'u1'] })
    expect(toast.success).toHaveBeenCalledWith('Template berhasil dihapus.')
  })

  it('shows error toast when deletion fails', async () => {
    resultRef.current = { data: null, error: { message: 'RLS violation' } }

    const { result } = renderHook(() => useDeleteMealTemplate(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({ templateId: 't1', userId: 'u1' })
      } catch {
        // expected
      }
    })

    expect(toast.error).toHaveBeenCalledWith('RLS violation')
  })
})
