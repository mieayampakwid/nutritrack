import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/hooks/useFoodLog', () => ({
  useFoodUnits: () => ({ data: [{ id: 'g', nama: 'gram' }], isLoading: false }),
  useFoodNameSuggestions: () => ({ data: [], isLoading: false }),
}))

const openaiMock = vi.hoisted(() => ({
  estimateCalories: vi.fn().mockResolvedValue([{ kalori: 200, nama_makanan: 'Nasi Goreng' }]),
  validateFoodInput: vi.fn().mockResolvedValue({ valid: true }),
}))

vi.mock('@/lib/openai', () => openaiMock)

const { supabaseMock } = vi.hoisted(() => {
  const makeChain = () => {
    const t = {}
    const proxy = new Proxy(t, {
      get(obj, prop) {
        if (prop === 'then') return (res) => res({ data: null, error: null })
        if (!obj[prop]) obj[prop] = vi.fn().mockReturnValue(proxy)
        return obj[prop]
      },
    })
    return proxy
  }
  return {
    supabaseMock: {
      from: vi.fn(() => makeChain()),
      auth: {
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { FoodEntryForm } from './FoodEntryForm'

describe('FoodEntryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the food list header and a single initial food row', () => {
    renderWithProviders(<FoodEntryForm userId="u1" />)
    expect(screen.getByText('Daftar makanan')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /entri makanan ke-1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analisa & simpan/i })).toBeInTheDocument()
  })

  it('"Tambah makanan" button adds a second food row', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FoodEntryForm userId="u1" />)

    await user.click(screen.getByRole('button', { name: /tambah makanan/i }))

    expect(screen.getAllByRole('group', { name: /entri makanan/i })).toHaveLength(2)
  })

  it('shows an error message when submitting with an empty food name', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FoodEntryForm userId="u1" />)

    await user.click(screen.getByRole('button', { name: /analisa & simpan/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    )
  })

  it('blocks submit until meal type selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FoodEntryForm userId="u1" />)

    await user.click(screen.getByRole('button', { name: /analisa & simpan/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/pilih waktu makan/i),
    )
  })
})
