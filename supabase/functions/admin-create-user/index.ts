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

    if (!callerProfile || callerProfile.is_active === false || callerProfile.role !== 'admin') {
      return json({ error: 'Hanya admin aktif yang dapat membuat pengguna.' }, 403)
    }

    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const nama = String(body?.nama ?? '').trim()
    const role = String(body?.role ?? '').trim()

    if (!email || !email.includes('@')) {
      return json({ error: 'Email tidak valid.' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'Kata sandi minimal 6 karakter.' }, 400)
    }
    if (!nama) {
      return json({ error: 'Nama wajib diisi.' }, 400)
    }
    if (!['admin', 'ahli_gizi', 'klien'].includes(role)) {
      return json({ error: 'Peran tidak valid.' }, 400)
    }

    // Check if email already exists
    const { data: existing } = await userScoped
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existing) {
      return json({ error: 'Email sudah terdaftar.' }, 409)
    }

    // Create auth user via service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama, role },
    })

    if (createErr || !newUser?.user) {
      return json({ error: createErr?.message ?? 'Gagal membuat pengguna.' }, 500)
    }

    // The DB trigger handle_new_user() sets is_active = false by default.
    // Immediately activate the user since admin is creating.
    const { error: updateErr } = await adminClient
      .from('profiles')
      .update({
        is_active: true,
        nama,
        email,
        role,
      })
      .eq('id', newUser.user.id)

    if (updateErr) {
      return json({
        ok: true,
        user_id: newUser.user.id,
        warning: 'Pengguna dibuat tetapi gagal mengaktifkan profil.',
      }, 200)
    }

    return json({ ok: true, user_id: newUser.user.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Kesalahan server'
    return json({ error: message }, 500)
  }
})
