import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const rawAnon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

function looksLikeEnvPlaceholder(s) {
  return !s || s.includes('YOUR_') || /^<[^>]+>$/.test(s)
}

function isValidHttpUrl(s) {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function isSupabaseConfigured() {
  return (
    isValidHttpUrl(rawUrl) &&
    Boolean(rawAnon) &&
    !looksLikeEnvPlaceholder(rawUrl) &&
    !looksLikeEnvPlaceholder(rawAnon)
  )
}

// Use connection pooler for better scalability (transaction mode)
// Replace '://db.' with '://pooler.' to use PgBouncer
const poolerUrl = rawUrl.replace('://db.', '://pooler.')

const clientUrl = isSupabaseConfigured() ? poolerUrl : 'https://configure-in-dotenv.invalid'
const clientKey = isSupabaseConfigured() ? rawAnon : 'sb-placeholder-not-configured'

export const supabase = createClient(clientUrl, clientKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    fetch: (url, options) => {
      return fetch(url, { ...options, timeout: 30000 })
    },
  },
})
