import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'

const { supabaseMock, setInsertError } = vi.hoisted(() => {
  let insertErr = null

  const chain = {}
  const proxy = new Proxy(chain, {
    get(t, prop) {
      if (prop === 'then') return (resolve) => resolve({ data: null, error: insertErr })
      if (!t[prop]) t[prop] = vi.fn().mockReturnValue(proxy)
      return t[prop]
    },
  })

  return {
    supabaseMock: { from: () => proxy },
    setInsertError: (err) => {
      insertErr = err
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const openaiMock = vi.hoisted(() => ({
  estimateExerciseCalories: vi.fn().mockResolvedValue({ kalori_estimasi: 450 }),
}))

vi.mock('@/lib/openai', () => openaiMock)

import { toast } from 'sonner'
import { ExerciseLogEntryCard } from './ExerciseLogEntryCard'

describe('ExerciseLogEntryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setInsertError(null)
    openaiMock.estimateExerciseCalories.mockResolvedValue({ kalori_estimasi: 450 })
  })

  it('disables Analisa button until fields are filled', () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)
    expect(screen.getByRole('button', { name: 'Analisa' })).toBeDisabled()
  })

  it('enables Analisa button when both fields have content', () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)
    fireEvent.change(screen.getByLabelText('Jenis olahraga'), { target: { value: 'Lari' } })
    expect(screen.getByRole('button', { name: 'Analisa' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Durasi'), { target: { value: '30 menit' } })
    expect(screen.getByRole('button', { name: 'Analisa' })).not.toBeDisabled()
  })

  it('shows receipt after analyze and calls AI with correct params', async () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)

    fireEvent.change(screen.getByLabelText('Jenis olahraga'), { target: { value: 'Lari' } })
    fireEvent.change(screen.getByLabelText('Durasi'), { target: { value: '30 menit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analisa' }))

    expect(screen.getByRole('status', { name: 'Menganalisa olahraga dengan AI' })).toBeInTheDocument()

    await waitFor(() => {
      expect(openaiMock.estimateExerciseCalories).toHaveBeenCalledWith('Lari', '30 menit')
    })

    await waitFor(() => {
      expect(screen.getByText('Estimasi kalori olahraga')).toBeInTheDocument()
    })

    expect(screen.getByText('Lari')).toBeInTheDocument()
    expect(screen.getByText('30 menit')).toBeInTheDocument()
    expect(screen.getByText('450')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument()
  })

  it('saves and clears form on success', async () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)

    fireEvent.change(screen.getByLabelText('Jenis olahraga'), { target: { value: 'Lari' } })
    fireEvent.change(screen.getByLabelText('Durasi'), { target: { value: '30 menit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analisa' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Simpan' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalled())

    expect(screen.getByLabelText('Jenis olahraga')).toHaveValue('')
    expect(screen.getByLabelText('Durasi')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Analisa' })).toBeDisabled()
  })

  it('returns to form view on Batal', async () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)

    fireEvent.change(screen.getByLabelText('Jenis olahraga'), { target: { value: 'Lari' } })
    fireEvent.change(screen.getByLabelText('Durasi'), { target: { value: '30 menit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analisa' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Analisa' })).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Jenis olahraga')).toHaveValue('Lari')
    expect(screen.getByLabelText('Durasi')).toHaveValue('30 menit')
  })

  it('shows error toast when AI call fails', async () => {
    openaiMock.estimateExerciseCalories.mockRejectedValueOnce(new Error('Gagal menganalisa'))
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)

    fireEvent.change(screen.getByLabelText('Jenis olahraga'), { target: { value: 'Lari' } })
    fireEvent.change(screen.getByLabelText('Durasi'), { target: { value: '30 menit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analisa' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Analisa' })).toBeInTheDocument()
    })
  })

  it('sanitizes control characters from input', async () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)

    fireEvent.change(screen.getByLabelText('Jenis olahraga'), { target: { value: 'Lari\x00 pagi' } })
    fireEvent.change(screen.getByLabelText('Durasi'), { target: { value: '30 menit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analisa' }))

    await waitFor(() => {
      expect(openaiMock.estimateExerciseCalories).toHaveBeenCalledWith('Lari pagi', '30 menit')
    })
  })

  it('shows inline errors for empty fields on blur', () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)
    fireEvent.blur(screen.getByLabelText('Jenis olahraga'))
    fireEvent.blur(screen.getByLabelText('Durasi'))
    expect(screen.getByText('Jenis olahraga wajib diisi.')).toBeInTheDocument()
    expect(screen.getByText('Durasi wajib diisi.')).toBeInTheDocument()
  })

  it('shows inline jenis error when AI rejects exercise type', async () => {
    openaiMock.estimateExerciseCalories.mockRejectedValueOnce(new Error('Input bukan aktivitas olahraga yang dikenal.'))
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)
    fireEvent.change(screen.getByLabelText('Jenis olahraga'), { target: { value: 'oke' } })
    fireEvent.change(screen.getByLabelText('Durasi'), { target: { value: '90 jam' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analisa' }))

    await waitFor(() => {
      expect(screen.getByText('Input bukan aktivitas olahraga yang dikenal.')).toBeInTheDocument()
    })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('clears inline error when user types', () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)
    fireEvent.blur(screen.getByLabelText('Jenis olahraga'))
    expect(screen.getByText('Jenis olahraga wajib diisi.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Jenis olahraga'), { target: { value: 'L' } })
    expect(screen.queryByText('Jenis olahraga wajib diisi.')).not.toBeInTheDocument()
  })
})
