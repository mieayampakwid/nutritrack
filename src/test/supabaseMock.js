import { vi } from 'vitest'

/**
 * Creates a chainable Supabase mock matching the PostgREST builder pattern.
 * Each method returns the chain itself. The chain is thenable and resolves
 * to the current value of `resultRef.current`.
 *
 * Usage:
 *   const resultRef = { current: { data: [], error: null } }
 *   const chain = createSupabaseChain(resultRef)
 *   vi.mock('@/lib/supabase', () => ({ supabase: { from: () => chain } }))
 *   // In test: resultRef.current = { data: [...], error: null }
 */
export function createSupabaseChain(resultRef) {
  const target = {}
  const proxied = new Proxy(target, {
    get(t, prop) {
      if (prop === 'then') return (resolve) => resolve(resultRef.current)
      if (!t[prop]) t[prop] = vi.fn().mockReturnValue(proxied)
      return t[prop]
    },
  })
  return proxied
}
