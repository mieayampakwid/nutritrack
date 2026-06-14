import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

export { screen, waitFor, within }

/**
 * Wraps `ui` in QueryClientProvider + MemoryRouter for component tests.
 *
 * Components that call `useAuth` must mock `@/hooks/useAuth` with `vi.mock`
 * in the test file — the AuthProvider is not included here to avoid its
 * Supabase side-effects during tests.
 */
export function renderWithProviders(ui, { initialEntries = ['/'], ...rtlOptions } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...rtlOptions }), queryClient }
}
