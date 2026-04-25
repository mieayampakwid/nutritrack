import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'staff-1' } },
    profile: { id: 'staff-1', nama: 'Dr. Staff', role: 'ahli_gizi' },
    loading: false,
    profileLoadError: null,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}))

const { supabaseMock, setTableData } = vi.hoisted(() => {
  const tableData = {}

  const makeChain = (tbl) => {
    const t = {}
    const proxy = new Proxy(t, {
      get(obj, prop) {
        if (prop === 'then') return (res) => res(tableData[tbl] ?? { data: null, error: null })
        if (!obj[prop]) obj[prop] = vi.fn().mockReturnValue(proxy)
        return obj[prop]
      },
    })
    return proxy
  }

  return {
    supabaseMock: {
      from: (tbl) => makeChain(tbl),
      auth: { signOut: vi.fn().mockResolvedValue({}) },
    },
    setTableData: (tbl, data) => {
      tableData[tbl] = { data, error: null }
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { ClientQuickSummaryModal } from './ClientQuickSummaryModal'

const mockClient = {
  id: 'c1',
  nama: 'Budi Santoso',
  email: 'budi@example.com',
  role: 'klien',
  is_active: true,
  instalasi: 'Poli Gizi',
  no_hp: '081234567890',
  jenis_kelamin: 'male',
  tanggal_lahir: '1990-01-01',
}

describe('ClientQuickSummaryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setTableData('profiles', mockClient)
    setTableData('assessments', [])
    setTableData('user_evaluations', [])
  })

  it('renders nothing when open is false', () => {
    renderWithProviders(
      <ClientQuickSummaryModal
        open={false}
        onOpenChange={vi.fn()}
        clientId="c1"
        linkPrefix="/gizi/clients"
      />,
    )
    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument()
  })

  it('renders client name when modal is open', async () => {
    renderWithProviders(
      <ClientQuickSummaryModal
        open
        onOpenChange={vi.fn()}
        clientId="c1"
        linkPrefix="/gizi/clients"
      />,
    )

    await waitFor(() =>
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument(),
    )
  })

  it('shows evaluation form fields when modal is open', async () => {
    renderWithProviders(
      <ClientQuickSummaryModal
        open
        onOpenChange={vi.fn()}
        clientId="c1"
        linkPrefix="/gizi/clients"
      />,
    )

    await waitFor(() =>
      expect(screen.getByText(/evaluasi|resume/i)).toBeInTheDocument(),
    )
  })
})
