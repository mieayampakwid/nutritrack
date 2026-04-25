import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

export function createQueryWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
  return { wrapper: Wrapper, queryClient: qc }
}
