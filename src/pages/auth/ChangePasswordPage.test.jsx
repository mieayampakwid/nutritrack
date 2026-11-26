import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'

const auth = vi.hoisted(() => ({
  value: null,
  signOut: vi.fn(),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.value }))

const { changePassword } = vi.hoisted(() => ({ changePassword: vi.fn() }))
vi.mock('@/lib/changePassword', () => ({ changePassword }))
vi.mock('@/lib/supabase', () => ({ isSupabaseConfigured: () => true, supabase: {} }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ChangePasswordPage } from './ChangePasswordPage'

function setAuth(over) {
  auth.value = {
    session: { user: { id: 'u1' } },
    profile: { role: 'klien', must_change_password: false },
    loading: false,
    signOut: auth.signOut,
    refreshProfile: auth.refreshProfile,
    ...over,
  }
}

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    changePassword.mockResolvedValue(undefined)
    setAuth({})
  })

  it('asks for the old password and rejects mismatched confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePasswordPage />)
    await user.type(screen.getByLabelText('Kata sandi lama'), 'lama12345')
    await user.type(screen.getByLabelText('Kata sandi baru'), 'baru12345')
    await user.type(screen.getByLabelText('Ulangi kata sandi baru'), 'beda12345')
    await user.click(screen.getByRole('button', { name: /simpan/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/tidak cocok/i)
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('submits old and new password then refreshes the profile', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePasswordPage />)
    await user.type(screen.getByLabelText('Kata sandi lama'), 'lama12345')
    await user.type(screen.getByLabelText('Kata sandi baru'), 'baru12345')
    await user.type(screen.getByLabelText('Ulangi kata sandi baru'), 'baru12345')
    await user.click(screen.getByRole('button', { name: /simpan/i }))
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('baru12345', 'lama12345'))
    expect(auth.refreshProfile).toHaveBeenCalled()
  })

  it('shows the server message when the old password is wrong', async () => {
    changePassword.mockRejectedValue(new Error('Kata sandi lama salah.'))
    const user = userEvent.setup()
    renderWithProviders(<ChangePasswordPage />)
    await user.type(screen.getByLabelText('Kata sandi lama'), 'salah1234')
    await user.type(screen.getByLabelText('Kata sandi baru'), 'baru12345')
    await user.type(screen.getByLabelText('Ulangi kata sandi baru'), 'baru12345')
    await user.click(screen.getByRole('button', { name: /simpan/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Kata sandi lama salah.')
  })

  it('forced mode offers sign out instead of cancel', () => {
    setAuth({ profile: { role: 'klien', must_change_password: true } })
    renderWithProviders(<ChangePasswordPage />)
    expect(screen.getByRole('button', { name: 'Keluar' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Batal' })).not.toBeInTheDocument()
  })

  it('recovery mode does not ask for the old password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePasswordPage recovery />)
    expect(screen.queryByLabelText('Kata sandi lama')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Kata sandi baru'), 'baru12345')
    await user.type(screen.getByLabelText('Ulangi kata sandi baru'), 'baru12345')
    await user.click(screen.getByRole('button', { name: /simpan/i }))
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('baru12345', null))
  })

  it('recovery without a session explains the link is invalid', () => {
    setAuth({ session: null, profile: null })
    renderWithProviders(<ChangePasswordPage recovery />)
    expect(screen.getByText('Tautan tidak berlaku')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tautan baru/i })).toHaveAttribute('href', '/lupa-kata-sandi')
  })
})
