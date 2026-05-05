import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, 'Content-Type': 'application/json' },
  })
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  )
}

function normalizePhone(s: string) {
  const trimmed = s.trim()
  if (!trimmed) return ''

  let digits = trimmed.replace(/\D+/g, '')
  if (!digits) return ''

  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  if (digits.startsWith('8')) digits = `62${digits}`

  if (!digits.startsWith('62')) return ''
  if (digits.length < 9) return ''

  return digits
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Tidak terautentikasi' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json({ error: 'Konfigurasi server tidak lengkap' }, 500)
    }

    const userScoped = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authErr,
    } = await userScoped.auth.getUser()
    if (authErr || !user) return json({ error: 'Tidak terautentikasi' }, 401)

    const { data: callerProfile, error: callerErr } = await userScoped
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle()
    if (callerErr) return json({ error: callerErr.message ?? 'Gagal memeriksa akses' }, 500)

    if (!callerProfile || callerProfile.is_active === false) {
      return json({ error: 'Akun tidak aktif.' }, 403)
    }

    if (callerProfile.role !== 'admin' && callerProfile.role !== 'ahli_gizi') {
      return json({ error: 'Hanya staff yang dapat mengubah nomor telepon.' }, 403)
    }

    const body = await req.json().catch(() => null)
    const userId = String(body?.user_id ?? '').trim()
    const phoneRaw = String(body?.phone ?? '')
    const phone = normalizePhone(phoneRaw)

    if (!userId || !isUuidLike(userId)) {
      return json({ error: 'Data tidak valid.' }, 400)
    }

    // Allow clearing the phone by sending empty string.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      phone: phone || null,
    })

    if (error) return json({ error: error.message ?? 'Gagal mengubah nomor telepon' }, 500)

    return json({ ok: true, user_id: userId, phone: data.user?.phone ?? null })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Kesalahan server'
    return json({ error: message }, 500)
  }
})

