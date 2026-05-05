import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }) => <div data-testid="app-shell">{children}</div>,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const { mockSupabase } = vi.hoisted(() => {
  const invoke = vi.fn()
  const refreshSession = vi.fn()
  const getUser = vi.fn()
  const rpc = vi.fn()

  function from(table) {
    if (table !== 'profiles') throw new Error(`Unexpected table: ${table}`)
    return {
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }
  }

  return {
    mockSupabase: {
      from,
      rpc,
      auth: { refreshSession, getUser },
      functions: { invoke },
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: mockSupabase,
}))

import { UserManagement } from './UserManagement'

describe('UserManagement reject pending user', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.rpc.mockImplementation((fn) => {
      if (fn === 'admin_list_profiles') {
        return Promise.resolve({
          data: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              nama: 'Pending User',
              email: 'pending@example.com',
              role: 'klien',
              is_active: false,
              created_at: '2026-01-01T00:00:00.000Z',
              phone: '+6281234567890',
            },
          ],
          error: null,
        })
      }
      throw new Error(`Unexpected rpc: ${fn}`)
    })
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    })
    mockSupabase.auth.getUser.mockResolvedValue({ error: null, data: { user: { id: 'admin' } } })
    mockSupabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null })
  })

  it('opens confirm dialog and invokes admin-delete-user on confirm', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserManagement />)

    expect((await screen.findAllByText('Pending User')).length).toBeGreaterThan(0)

    const buttons = screen.getAllByRole('button')
    const rejectBtn = buttons.find((b) => String(b.className).includes('text-red-600'))
    expect(rejectBtn).toBeTruthy()

    await user.click(rejectBtn)

    expect(screen.getByText('Hapus pengguna pending?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hapus' }))

    await waitFor(() =>
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'admin-delete-user',
        expect.objectContaining({
          body: { user_id: '11111111-1111-4111-8111-111111111111' },
          headers: { Authorization: 'Bearer tok' },
        }),
      ),
    )
  }, 15000)
})

