import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'

const { sendPasswordReset } = vi.hoisted(() => ({ sendPasswordReset: vi.fn() }))
vi.mock('@/lib/changePassword', () => ({ sendPasswordReset }))
vi.mock('@/lib/supabase', () => ({ isSupabaseConfigured: () => true, supabase: {} }))

import { ForgotPasswordPage } from './ForgotPasswordPage'

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendPasswordReset.mockResolvedValue(undefined)
  })

  it('rejects an invalid email without calling the server', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText('Email'), 'bukan-email')
    await user.click(screen.getByRole('button', { name: /kirim tautan/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Format email tidak valid')
    expect(sendPasswordReset).not.toHaveBeenCalled()
  })

  it('shows a neutral confirmation after sending', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText('Email'), 'uji@contoh.com')
    await user.click(screen.getByRole('button', { name: /kirim tautan/i }))
    await waitFor(() => expect(sendPasswordReset).toHaveBeenCalledWith('uji@contoh.com'))
    expect(await screen.findByText('Cek email Anda')).toBeInTheDocument()
  })

  it('shows the error message when sending fails', async () => {
    sendPasswordReset.mockRejectedValue(new Error('Gagal mengirim email. Coba lagi nanti.'))
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText('Email'), 'uji@contoh.com')
    await user.click(screen.getByRole('button', { name: /kirim tautan/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal mengirim email')
  })
})
