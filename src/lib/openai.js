import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/**
 * Estimasi kalori via Supabase Edge Function — kunci OpenAI hanya di server.
 *
 * Deploy: supabase functions deploy estimate-calories
 * Secret: supabase secrets set OPENAI_API_KEY=<key>
 * Lokal: supabase functions serve --env-file supabase/.env.local
 */
function fetchErrorDetail(err) {
  const ctx = err.context
  if (ctx instanceof Error) return ctx.message
  if (ctx != null && typeof ctx === 'object' && 'message' in ctx) return String(ctx.message)
  return ctx != null ? String(ctx) : ''
}

export async function estimateCalories(items) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.',
    )
  }

  // Refresh so access_token is valid; use that token explicitly. Otherwise fetchWithAuth
  // can fall back to the anon key as Bearer when session is momentarily empty → "invalid jwt".
  const {
    data: refreshData,
    error: refreshError,
  } = await supabase.auth.refreshSession()
  const accessToken = refreshData?.session?.access_token
  if (refreshError || !accessToken) {
    throw new Error(
      'Sesi tidak valid atau sudah habis. Silakan keluar lalu login kembali.',
    )
  }

  const { error: userError } = await supabase.auth.getUser()
  if (userError) {
    throw new Error(
      'Sesi tidak valid. Silakan keluar lalu login kembali.',
    )
  }

  const { data, error } = await supabase.functions.invoke('estimate-calories', {
    body: { items },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (error) {
    if (error instanceof FunctionsFetchError) {
      const detail = fetchErrorDetail(error)
      const base = detail
        ? `${error.message}: ${detail}`
        : `${error.message} Periksa koneksi, pemblokir iklan, dan URL Supabase.`
      // Preflight OPTIONS ke /functions/v1/<name> mengembalikan 404 jika fungsi belum di-deploy;
      // browser memblokir permintaan dan fetch gagal dengan "Failed to fetch" (bukan HTTP error).
      const hint =
        /failed to fetch|load failed|networkerror/i.test(detail)
          ? ' Pastikan Edge Function `estimate-calories` sudah di-deploy ke proyek ini (`supabase functions deploy estimate-calories`) dan secret `OPENAI_API_KEY` sudah di-set.'
          : ''
      throw new Error(base + hint)
    }
    if (error instanceof FunctionsRelayError) {
      throw new Error(
        `${error.message} Pastikan Edge Function estimate-calories sudah di-deploy untuk proyek ini.`,
      )
    }
    let msg = error.message
    if (error instanceof FunctionsHttpError) {
      const res = error.context
      const status = res.status
      try {
        const raw = await res.text()
        let j = null
        try {
          j = raw ? JSON.parse(raw) : null
        } catch {
          j = null
        }
        if (j && typeof j === 'object') {
          if (typeof j.error === 'string') msg = j.error
          else if (typeof j.message === 'string') msg = j.message
        } else if (raw?.trim()) {
          msg = raw.trim().slice(0, 280)
        }
        if (msg === error.message && status) {
          msg = `${msg} (HTTP ${status})`
        }
      } catch {
        if (status) msg = `${msg} (HTTP ${status})`
      }
    }
    throw new Error(msg || 'Gagal memanggil layanan estimasi')
  }

  if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
    throw new Error(String(data.error))
  }

  if (!Array.isArray(data)) {
    throw new Error('Format respons tidak valid')
  }

  return data
}

export async function validateFoodInput(items) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.',
    )
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Data tidak valid.')
  }

  const {
    data: refreshData,
    error: refreshError,
  } = await supabase.auth.refreshSession()
  const accessToken = refreshData?.session?.access_token
  if (refreshError || !accessToken) {
    throw new Error('Sesi tidak valid atau sudah habis. Silakan keluar lalu login kembali.')
  }

  const { error: userError } = await supabase.auth.getUser()
  if (userError) {
    throw new Error('Sesi tidak valid. Silakan keluar lalu login kembali.')
  }

  const { data, error } = await supabase.functions.invoke('validate-food', {
    body: { items },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (error) {
    if (error instanceof FunctionsFetchError) {
      const detail = fetchErrorDetail(error)
      const base = detail
        ? `${error.message}: ${detail}`
        : `${error.message} Periksa koneksi, pemblokir iklan, dan URL Supabase.`
      const hint =
        /failed to fetch|load failed|networkerror/i.test(detail)
          ? ' Pastikan Edge Function `validate-food` sudah di-deploy ke proyek ini (`supabase functions deploy validate-food`) dan secret `OPENAI_API_KEY` sudah di-set.'
          : ''
      throw new Error(base + hint)
    }
    if (error instanceof FunctionsRelayError) {
      throw new Error(
        `${error.message} Pastikan Edge Function validate-food sudah di-deploy untuk proyek ini.`,
      )
    }
    let msg = error.message
    if (error instanceof FunctionsHttpError) {
      const res = error.context
      const status = res.status
      try {
        const raw = await res.text()
        let j = null
        try {
          j = raw ? JSON.parse(raw) : null
        } catch {
          j = null
        }
        if (j && typeof j === 'object') {
          if (typeof j.error === 'string') msg = j.error
          else if (typeof j.message === 'string') msg = j.message
        } else if (raw?.trim()) {
          msg = raw.trim().slice(0, 280)
        }
        if (msg === error.message && status) {
          msg = `${msg} (HTTP ${status})`
        }
      } catch {
        if (status) msg = `${msg} (HTTP ${status})`
      }
    }
    throw new Error(msg || 'Gagal memanggil layanan validasi')
  }

  if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
    throw new Error(String(data.error))
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Format respons tidak valid')
  }

  if (typeof data.valid !== 'boolean') {
    throw new Error('Format respons tidak valid')
  }

  if (data.valid === false && typeof data.message !== 'string') {
    throw new Error('Format respons tidak valid')
  }

  if (data.invalid_inputs != null) {
    if (!Array.isArray(data.invalid_inputs) || !data.invalid_inputs.every((x) => typeof x === 'string')) {
      throw new Error('Format respons tidak valid')
    }
  }

  if (data.invalid_indices != null) {
    if (
      !Array.isArray(data.invalid_indices) ||
      !data.invalid_indices.every((x) => typeof x === 'number' && Number.isFinite(x))
    ) {
      throw new Error('Format respons tidak valid')
    }
  }

  return data
}
