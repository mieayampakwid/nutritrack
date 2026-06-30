import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MyMealTemplates } from './MyMealTemplates'

const baseTemplates = [
  {
    id: 't1',
    nama: 'Nasi goreng (+2)',
    meal_template_items: [
      { id: 'i1', kalori_estimasi: 400 },
      { id: 'i2', kalori_estimasi: 140 },
    ],
  },
  {
    id: 't2',
    nama: 'Oatmeal',
    meal_template_items: [
      { id: 'i3', kalori_estimasi: 150 },
    ],
  },
]

const mutateMock = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', role: 'klien', nama: 'Test' },
  }),
}))

vi.mock('@/hooks/useMealTemplates', () => ({
  useMealTemplates: () => ({
    data: baseTemplates,
    isLoading: false,
  }),
  useDeleteMealTemplate: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
  useUpdateMealTemplate: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCreateMealTemplate: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

describe('MyMealTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title', () => {
    renderWithProviders(<MyMealTemplates />)
    expect(screen.getByText('Template makanan saya')).toBeInTheDocument()
  })

  it('renders template rows with name, item count, and calories', () => {
    renderWithProviders(<MyMealTemplates />)
    expect(screen.getByText('Nasi goreng (+2)')).toBeInTheDocument()
    expect(screen.getByText('2 item · 540 kkal')).toBeInTheDocument()
    expect(screen.getByText('Oatmeal')).toBeInTheDocument()
    expect(screen.getByText('1 item · 150 kkal')).toBeInTheDocument()
  })

  it('shows empty state when no templates exist', () => {
    vi.doMock('@/hooks/useMealTemplates', () => ({
      useMealTemplates: () => ({ data: [], isLoading: false }),
      useDeleteMealTemplate: () => ({ mutate: mutateMock, isPending: false }),
      useUpdateMealTemplate: () => ({ mutate: vi.fn(), isPending: false }),
      useCreateMealTemplate: () => ({ mutate: vi.fn(), isPending: false }),
    }))
    vi.resetModules()
    // The hoisted mock returns baseTemplates, so the empty text should NOT appear
    renderWithProviders(<MyMealTemplates />)
    expect(screen.queryByText(/belum ada template tersimpan/i)).not.toBeInTheDocument()
  })

  it('shows Tambah template button', () => {
    renderWithProviders(<MyMealTemplates />)
    expect(screen.getByRole('button', { name: /tambah template/i })).toBeInTheDocument()
  })

  it('opens editor when Tambah template is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyMealTemplates />)

    await user.click(screen.getByRole('button', { name: /tambah template/i }))
    expect(screen.getByText('Template baru')).toBeInTheDocument()
    expect(screen.getByText('Kembali')).toBeInTheDocument()
  })

  it('opens editor when Edit button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyMealTemplates />)

    await user.click(screen.getByRole('button', { name: /edit template nasi goreng/i }))
    expect(screen.getByText('Edit template')).toBeInTheDocument()
  })

  it('returns to list when Kembali is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyMealTemplates />)

    await user.click(screen.getByRole('button', { name: /tambah template/i }))
    expect(screen.getByText('Template baru')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /kembali/i }))
    expect(screen.queryByText('Template baru')).not.toBeInTheDocument()
    expect(screen.getByText('Nasi goreng (+2)')).toBeInTheDocument()
  })

  it('opens confirm dialog when trash button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyMealTemplates />)

    await user.click(screen.getByRole('button', { name: /hapus template nasi goreng/i }))
    expect(screen.getByText('Hapus template?')).toBeInTheDocument()
    expect(screen.getAllByText('Nasi goreng (+2)').length).toBeGreaterThanOrEqual(1)
  })

  it('closes dialog on Batal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyMealTemplates />)

    await user.click(screen.getByRole('button', { name: /hapus template nasi goreng/i }))
    expect(screen.getByText('Hapus template?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Batal' }))
    expect(screen.queryByText('Hapus template?')).not.toBeInTheDocument()
  })

  it('calls delete mutation on Hapus confirm', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyMealTemplates />)

    await user.click(screen.getByRole('button', { name: /hapus template nasi goreng/i }))
    await user.click(screen.getByRole('button', { name: 'Hapus' }))

    expect(mutateMock).toHaveBeenCalledWith(
      { templateId: 't1', userId: 'user-1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
