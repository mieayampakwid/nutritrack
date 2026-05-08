import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { randomPassword } from './UserManagement.jsx'

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }) => <div data-testid="app-shell">{children}</div>,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { toast } from 'sonner'

const { mockSupabase } = vi.hoisted(() => {
  const invoke = vi.fn()
  const refreshSession = vi.fn()
  const getUser = vi.fn()
  const signUp = vi.fn()
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
      auth: { refreshSession, getUser, signUp },
      functions: { invoke },
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: mockSupabase,
}))

import { UserManagement } from './UserManagement'

function setupDefaultMocks() {
  mockSupabase.rpc.mockImplementation((fn) => {
    if (fn === 'admin_list_profiles') {
      return Promise.resolve({ data: [], error: null })
    }
    if (fn === 'admin_activate_user') {
      return Promise.resolve({ data: { success: true }, error: null })
    }
    throw new Error(`Unexpected rpc: ${fn}`)
  })
  mockSupabase.auth.signUp.mockResolvedValue({
    data: { user: { id: 'new-user-id' }, session: null },
    error: null,
  })
  mockSupabase.auth.refreshSession.mockResolvedValue({
    data: { session: { access_token: 'tok' } },
    error: null,
  })
  mockSupabase.auth.getUser.mockResolvedValue({ error: null, data: { user: { id: 'admin' } } })
  mockSupabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null })
}

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

describe('UserManagement create user', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('successfully creates user and displays generated password', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(<UserManagement />)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const addButton = screen.getByRole('button', { name: 'Tambah pengguna' })
    await user.click(addButton)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const inputs = screen.getAllByRole('textbox')
    const namaInput = inputs[0]
    const emailInput = inputs[1]

    await user.type(namaInput, 'Test User')
    await user.type(emailInput, 'test@example.com')

    const saveButton = screen.getByRole('button', { name: 'Simpan' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          options: expect.objectContaining({
            data: expect.objectContaining({
              nama: 'Test User',
              role: 'klien',
            }),
          }),
        }),
      )
    })

    await waitFor(() => {
      expect(mockSupabase.rpc).toHaveBeenCalledWith('admin_activate_user', {
        p_user_id: 'new-user-id',
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Simpan kata sandi sementara')).toBeInTheDocument()
      const passwordInput = screen.getByDisplayValue(/^[a-zA-Z0-9]{12}$/)
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput.value).toHaveLength(12)
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['profiles_admin'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['client_directory'] })
    expect(toast.success).toHaveBeenCalledWith('Pengguna dibuat.')
  }, 15000)

  it('validates email format and shows error', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserManagement />)

    const addButton = screen.getByRole('button', { name: 'Tambah pengguna' })
    await user.click(addButton)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const inputs = screen.getAllByRole('textbox')
    const namaInput = inputs[0]
    const emailInput = inputs[1]

    await user.type(namaInput, 'Test User')
    await user.type(emailInput, 'invalid-email')

    const saveButton = screen.getByRole('button', { name: 'Simpan' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Format email tidak valid')
    }, { timeout: 3000 })

    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('validates required fields and shows error for missing nama', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserManagement />)

    const addButton = screen.getByRole('button', { name: 'Tambah pengguna' })
    await user.click(addButton)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const inputs = screen.getAllByRole('textbox')
    const emailInput = inputs[1]
    await user.type(emailInput, 'test@example.com')

    const saveButton = screen.getByRole('button', { name: 'Simpan' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nama wajib diisi')
    }, { timeout: 3000 })

    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('handles signUp error', async () => {
    const user = userEvent.setup()
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    })

    renderWithProviders(<UserManagement />)

    const addButton = screen.getByRole('button', { name: 'Tambah pengguna' })
    await user.click(addButton)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const inputs = screen.getAllByRole('textbox')
    const namaInput = inputs[0]
    const emailInput = inputs[1]

    await user.type(namaInput, 'Test User')
    await user.type(emailInput, 'existing@example.com')

    const saveButton = screen.getByRole('button', { name: 'Simpan' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('User already registered')
    }, { timeout: 3000 })
  })

  it('handles admin_activate_user RPC error', async () => {
    const user = userEvent.setup()
    mockSupabase.rpc.mockImplementation((fn) => {
      if (fn === 'admin_list_profiles') {
        return Promise.resolve({ data: [], error: null })
      }
      if (fn === 'admin_activate_user') {
        return Promise.resolve({
          data: null,
          error: { message: 'permission_denied' },
        })
      }
      throw new Error(`Unexpected rpc: ${fn}`)
    })

    renderWithProviders(<UserManagement />)

    const addButton = screen.getByRole('button', { name: 'Tambah pengguna' })
    await user.click(addButton)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const inputs = screen.getAllByRole('textbox')
    const namaInput = inputs[0]
    const emailInput = inputs[1]

    await user.type(namaInput, 'Test User')
    await user.type(emailInput, 'test@example.com')

    const saveButton = screen.getByRole('button', { name: 'Simpan' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('permission_denied')
    }, { timeout: 3000 })
  })

  it('uses auto-generated password when password field is empty', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(<UserManagement />)

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const addButton = screen.getByRole('button', { name: 'Tambah pengguna' })
    await user.click(addButton)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const inputs = screen.getAllByRole('textbox')
    const namaInput = inputs[0]
    const emailInput = inputs[1]

    await user.type(namaInput, 'Test User')
    await user.type(emailInput, 'test@example.com')

    const saveButton = screen.getByRole('button', { name: 'Simpan' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Simpan kata sandi sementara')).toBeInTheDocument()
      const passwordInput = screen.getByDisplayValue(/^[a-zA-Z0-9]{12}$/)
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput.value).toHaveLength(12)
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['profiles_admin'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['client_directory'] })
    expect(toast.success).toHaveBeenCalledWith('Pengguna dibuat.')
  })
})

describe('UserManagement password generation', () => {
  it('generates 12-character password with valid characters', () => {
    const password = randomPassword()

    expect(password).toHaveLength(12)
    expect(password).toMatch(/^[a-zA-Z0-9]+$/)

    const allPasswords = Array.from({ length: 100 }, () => randomPassword())
    const uniquePasswords = new Set(allPasswords)
    expect(uniquePasswords.size).toBeGreaterThan(90)
  })

  it('excludes ambiguous characters (1 and 0) from password', () => {
    const allPasswords = Array.from({ length: 100 }, () => randomPassword()).join('')

    expect(allPasswords).not.toContain('1')
    expect(allPasswords).not.toContain('0')
  })
})
