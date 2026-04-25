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

vi.mock('@/hooks/useFoodLog', () => ({
  useFoodLogsForUser: () => ({ data: [], isLoading: false, isSuccess: true }),
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }) => <div data-testid="app-shell">{children}</div>,
}))

vi.mock('@/components/food/FoodLogTable', () => ({
  FoodLogTable: () => <div data-testid="food-log-table" />,
}))

vi.mock('@/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: () => null,
}))

const { supabaseMock, setTableData } = vi.hoisted(() => {
  const tableData = {}

  const makeChain = (tbl) => {
    const t = {}
    const proxy = new Proxy(t, {
      get(obj, prop) {
        if (prop === 'then') return (res) => res(tableData[tbl] ?? { data: [], error: null })
        if (!obj[prop]) obj[prop] = vi.fn().mockReturnValue(proxy)
        return obj[prop]
      },
    })
    return proxy
  }

  return {
    supabaseMock: { from: (tbl) => makeChain(tbl) },
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

import { FoodLogMonitor } from './FoodLogMonitor'

const mockClients = [
  { id: 'c1', nama: 'Budi Santoso', instalasi: 'Poli Gizi' },
  { id: 'c2', nama: 'Siti Rahayu', instalasi: 'Poli Jantung' },
]

describe('FoodLogMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setTableData('profiles', mockClients)
  })

  it('renders the filter card with heading and client combobox', () => {
    renderWithProviders(<FoodLogMonitor />, { initialEntries: ['/gizi/food-log-monitor'] })
    expect(screen.getByText('Filter')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /klien/i })).toBeInTheDocument()
  })

  it('query resolves and combobox renders without error', async () => {
    renderWithProviders(<FoodLogMonitor />, { initialEntries: ['/gizi/food-log-monitor'] })

    // The combobox renders in enabled state once the client query resolves
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /klien/i })).not.toBeDisabled(),
    )
    expect(screen.getByText('Pantau log makan')).toBeInTheDocument()
  })
})
