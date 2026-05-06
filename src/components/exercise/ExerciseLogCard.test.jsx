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

import { toast } from 'sonner'
import { ExerciseLogEntryCard } from './ExerciseLogEntryCard'

describe('ExerciseLogEntryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setInsertError(null)
  })

  it('disables submit button until fields are filled', () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeDisabled()
  })

  it('submits and clears inputs on success', async () => {
    renderWithProviders(<ExerciseLogEntryCard userId="u1" />)

    fireEvent.change(screen.getByLabelText('Jenis olahraga'), { target: { value: 'Lari' } })
    fireEvent.change(screen.getByLabelText('Durasi'), { target: { value: '30 menit' } })
    expect(screen.getByRole('button', { name: 'Tambah' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(screen.getByLabelText('Jenis olahraga')).toHaveValue('')
    expect(screen.getByLabelText('Durasi')).toHaveValue('')
  })
})

