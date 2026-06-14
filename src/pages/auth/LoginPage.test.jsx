import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: null,
    profile: null,
    loading: false,
    profileLoadError: null,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}))

const { mockAuth } = vi.hoisted(() => {
  return {
    mockAuth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { auth: mockAuth },
}))

vi.mock('@/components/dashboard/AdBannerCarousel', () => ({
  AdBannerCarousel: () => null,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { LoginPage } from './LoginPage'
import { toast } from 'sonner'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.signInWithPassword.mockResolvedValue({ error: null })
  })

  it('renders email field, password field, and submit button', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    // Use exact string to avoid matching "Tampilkan kata sandi" button aria-label
    expect(screen.getByLabelText('Kata sandi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument()
  })

  it('shows toast error and does not call signIn for a too-short password', async () => {
    // Use a valid email so HTML5 form validation passes, but a short password
    // so Zod's min(6) fires toast.error and blocks signIn.
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText('Kata sandi'), 'abc')
    await user.click(screen.getByRole('button', { name: /masuk/i }))

    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Kata sandi minimal 6 karakter')
  })

  it('calls signInWithPassword with valid credentials', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText('Kata sandi'), 'password123')
    await user.click(screen.getByRole('button', { name: /masuk/i }))

    await waitFor(() =>
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      }),
    )
  })

  it('shows toast error when authentication fails', async () => {
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    })
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText('Kata sandi'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /masuk/i }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Invalid login credentials'),
    )
  })
})
