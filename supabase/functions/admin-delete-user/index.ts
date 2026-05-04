import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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

    // Use caller JWT to identify & authorize caller via DB.
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

    if (!callerProfile || callerProfile.is_active === false || callerProfile.role !== 'admin') {
      return json({ error: 'Hanya admin aktif yang dapat menghapus pengguna.' }, 403)
    }

    const body = await req.json().catch(() => null)
    const userId = String(body?.user_id ?? '').trim()
    if (!userId || !isUuidLike(userId)) {
      return json({ error: 'Data tidak valid.' }, 400)
    }

    // Safety: only allow deleting users who are still pending (is_active=false).
    const { data: targetProfile, error: targetErr } = await userScoped
      .from('profiles')
      .select('is_active')
      .eq('id', userId)
      .maybeSingle()
    if (targetErr) return json({ error: targetErr.message ?? 'Gagal memuat pengguna' }, 500)
    if (!targetProfile) return json({ error: 'Pengguna tidak ditemukan.' }, 404)
    if (targetProfile.is_active !== false) {
      return json({ error: 'Hanya pengguna pending yang dapat dihapus.' }, 409)
    }

    // Use service role for privileged deletion in Auth.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(userId)
    if (delAuthErr) return json({ error: delAuthErr.message ?? 'Gagal menghapus pengguna' }, 500)

    // Cleanup profile row (best-effort; in many schemas this is handled by cascade/trigger).
    const { error: delProfileErr } = await adminClient.from('profiles').delete().eq('id', userId)
    if (delProfileErr) {
      // Auth user already deleted; return 200 with warning to avoid retry loops deleting non-existent auth user.
      return json({ ok: true, warning: delProfileErr.message ?? 'Gagal menghapus profil' }, 200)
    }

    return json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Kesalahan server'
    return json({ error: message }, 500)
  }
})

