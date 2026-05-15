import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const MAX_ITEMS = 40
const MAX_JUMLAH = 10000

function sanitize(s: string, maxLen = 100): string {
  return s
    .replace(/[\n\r\t\x00-\x1f]/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,&()\-/]/gu, '')
    .trim()
    .slice(0, maxLen)
}

const SYSTEM_MESSAGE = `Kamu adalah ahli gizi. Estimasi kandungan gizi untuk setiap makanan yang diberikan user.
Berikan response HANYA dalam format JSON array, tanpa teks lain.
Format per item:
{
  "nama_makanan": "string",
  "kalori": number (kkal, bilangan bulat),
  "karbohidrat": number (gram, 1 desimal),
  "protein": number (gram, 1 desimal),
  "lemak": number (gram, 1 desimal),
  "serat": number (gram, 1 desimal),
  "natrium": number (miligram, bilangan bulat)
}
Gunakan estimasi kandungan gizi yang umum untuk makanan Indonesia.
Jika makanan tidak dikenal, estimasi berdasarkan bahan utama yang paling mungkin.
Pastikan setiap field numerik selalu ada — jangan ada yang kosong atau null.`

function buildUserMessage(
  items: { nama_makanan: string; jumlah: number; unit_nama: string }[],
) {
  return `Data makanan:\n${items
    .map(
      (item, i) =>
        `${i + 1}. ${item.nama_makanan} - ${item.jumlah} ${item.unit_nama}`,
    )
    .join('\n')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Tidak terautentikasi' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Konfigurasi server tidak lengkap' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Tidak terautentikasi' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.is_active === false || (profile.role !== 'klien' && profile.role !== 'ahli_gizi')) {
      return new Response(
        JSON.stringify({ error: 'Hanya klien atau ahli gizi aktif yang dapat menganalisa kalori.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const body = await req.json().catch(() => null)
    const items = body?.items
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Data tidak valid.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (items.length > MAX_ITEMS) {
      return new Response(
        JSON.stringify({ error: `Maksimal ${MAX_ITEMS} jenis makanan per permintaan.` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const normalized = items.map((item: Record<string, unknown>) => ({
      nama_makanan: sanitize(String(item.nama_makanan ?? '')),
      jumlah: Math.min(Number(item.jumlah), MAX_JUMLAH),
      unit_nama: sanitize(String(item.unit_nama ?? ''), 50),
    }))

    if (
      items.some(
        (item: Record<string, unknown>) =>
          Number(item.jumlah) > MAX_JUMLAH,
      )
    ) {
      return new Response(
        JSON.stringify({ error: 'Jumlah melebihi batas maksimum (10.000).' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (
      normalized.some(
        (i) =>
          !i.nama_makanan ||
          !i.unit_nama ||
          Number.isNaN(i.jumlah) ||
          i.jumlah <= 0,
      )
    ) {
      return new Response(
        JSON.stringify({ error: 'Setiap baris wajib berisi nama, jumlah, dan satuan.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'Layanan estimasi belum dikonfigurasi.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userMessage = buildUserMessage(normalized)
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

    const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    })

    const oaiData = await oaiRes.json()
    if (!oaiRes.ok) {
      const msg =
        typeof oaiData?.error?.message === 'string'
          ? oaiData.error.message
          : 'Gagal memanggil OpenAI'
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const raw = oaiData.choices?.[0]?.message?.content
    if (typeof raw !== 'string') {
      return new Response(JSON.stringify({ error: 'Respons OpenAI tidak valid' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed)) {
      return new Response(JSON.stringify({ error: 'Format AI tidak dikenali' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Kesalahan server'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
