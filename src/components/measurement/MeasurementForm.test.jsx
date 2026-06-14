import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'

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
  return { supabaseMock: { from: vi.fn(() => makeChain()) } }
})

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { MeasurementForm } from './MeasurementForm'
import { toast } from 'sonner'

const defaultProps = {
  targetUserId: 'u1',
  staffId: 'staff-1',
  clientProfile: { nama: 'Budi Santoso', instalasi: 'Poli Gizi' },
  lastMeasurement: null,
}

describe('MeasurementForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders weight, height fields, and submit button', () => {
    renderWithProviders(<MeasurementForm {...defaultProps} />)
    expect(screen.getByText('Berat badan (kg)')).toBeInTheDocument()
    expect(screen.getByText('Tinggi badan (cm)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /simpan/i })).toBeInTheDocument()
  })

  it('displays client name in the profile section', () => {
    renderWithProviders(<MeasurementForm {...defaultProps} />)
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
  })

  it('auto-calculates and displays BMI when weight and height are entered', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MeasurementForm {...defaultProps} />)

    const inputs = screen.getAllByPlaceholderText('0')
    const beratInput = inputs[0]
    const tinggiInput = inputs[1]

    await user.clear(beratInput)
    await user.type(beratInput, '70')
    await user.clear(tinggiInput)
    await user.type(tinggiInput, '170')

    await waitFor(() =>
      expect(screen.getByText(/24/)).toBeInTheDocument(),
    )
  })

  it('shows toast error when submitting without weight or height', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MeasurementForm {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /simpan/i }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/berat dan tinggi/i),
      ),
    )
  })
})
