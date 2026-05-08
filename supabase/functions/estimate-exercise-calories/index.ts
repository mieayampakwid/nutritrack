import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function sanitize(s: string, maxLen = 100): string {
  return s
    .replace(/[\n\r\t\x00-\x1f]/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,&()\-/]/gu, '')
    .trim()
    .slice(0, maxLen)
}

function looksLikeGarbage(s: string): boolean {
  const t = s.trim()
  if (!t) return true
  // Reject random keystrokes: all consonants, no vowels
  if (/^[bcdfghjklmnpqrstvwxyz]{4,}$/i.test(t)) return true
  // Reject keyboard smashing patterns
  if (/^(asdf|qwer|zxcv|hjkl|uiop|nm,.)+$/i.test(t)) return true
  // Reject purely special chars / numbers without letters
  if (/^[^a-zA-Z\u00C0-\u024F]+$/.test(t)) return true
  return false
}

const SYSTEM_MESSAGE = `Kamu adalah ahli gizi olahraga. Estimasi kalori yang terbakar berdasarkan jenis aktivitas fisik dan durasi.

Berikan response HANYA dalam format JSON object, tanpa teks lain.

FORMAT UNTUK INPUT VALID:
{ "kalori_estimasi": 123 }

FORMAT UNTUK INPUT TIDAK VALID (hanya jika jenis aktivitas ATAU durasi benar-benar tidak masuk akal):
{ "kalori_estimasi": 0, "valid": false, "message": "Alasan singkat dalam Bahasa Indonesia." }

ATURAN PENTING:
1. KAMU HARUS MENERIMA SEMUA JENIS AKTIVITAS FISIK sebagai input valid. Manusia membakar kalori saat melakukan aktivitas apapun yang melibatkan gerakan tubuh — termasuk olahraga, pekerjaan rumah, aktivitas seksual, pekerjaan fisik, bermain, menari, bela diri, panjat tebing, mendaki gunung, menyelam, dll.
2. HANYA tolak jika input adalah:
   - Kata acak tanpa makna (misal: "oke", "asdasd", "xyz")
   - Benda mati (misal: "meja", "mobil", "laptop")
   - Aktivitas murni sedentari tanpa gerakan (misal: "tidur", "nonton TV", "baca buku")
   Jika ragu antara valid dan tidak, pilih VALID.
3. Durasi: interpretasikan dengan cerdas dan SELALU konversi ke menit. Format yang valid sangat beragam — contoh:
   - "30 menit" = 30 menit
   - "1 jam 30 menit" = 90 menit
   - "90 jam" = 5400 menit
   - "2 hari" = 2880 menit
   - "3 set" / "3 putaran" / "3 sesi" = per set sekitar 15-20 menit aktif (gunakan penilaian terbaik berdasarkan jenis aktivitas)
   - "100 reps" / "100 repetisi" = estimasi durasi berdasarkan kecepatan wajar per repetisi
   - "5 km" (lari) = sekitar 25-30 menit untuk pelari rekreasi
   Kamu HARUS selalu bisa mengestimasi selama durasi tidak sepenuhnya ngawur. Jika durasi benar-benar tidak masuk akal (misal: "asdasd", "oke", "warna hijau"), baru nyatakan tidak valid.
4. Gunakan MET standar:
   - Lari (8 km/jam): MET 8 | Lari (10 km/jam): MET 10 | Lari santai: MET 6
   - Jalan cepat (6 km/jam): MET 5 | Jalan santai: MET 3
   - Bersepeda (sedang 20 km/jam): MET 8 | Bersepeda santai: MET 4
   - Renang (sedang): MET 7 | Renang santai: MET 5
   - Senam / aerobik: MET 6 | Senam berat: MET 8
   - Yoga: MET 3 | Pilates: MET 3.5
   - Angkat beban (sedang): MET 5 | Angkat beban berat: MET 6
   - Bulutangkis: MET 5.5 | Tenis: MET 7
   - Sepak bola: MET 8 | Futsal: MET 7
   - Basket: MET 6.5 | Voli: MET 4
   - Skipping / lompat tali: MET 10
   - HIIT / CrossFit: MET 8
   - Zumba / dansa: MET 7.5
   - Panjat tebing / rock climbing: MET 8
   - Mendaki gunung: MET 7
   - Bela diri (karate, taekwondo, silat, tinju): MET 10
   - Aktivitas seksual / hubungan intim (sedang): MET 4 (aktif: 5.5, ringan: 2.5)
   - Bersih-bersih rumah (mengepel, menyapu): MET 3.5
   - Berkebun: MET 4
   - Mengecat / renovasi: MET 4.5
   - Aktivitas fisik lain yang masuk akal: MET 4 (intensitas ringan) atau MET 6 (intensitas sedang-berat) — pilih yang paling sesuai.
5. Rumus: kalori = MET × berat_badan_kg × (durasi_menit / 60)
6. Hasil harus bilangan bulat. Maksimal 10000 kalori per sesi.`

function buildUserMessage(jenisOlahraga: string, durasi: string, beratBadan: number) {
  return `Jenis olahraga: ${jenisOlahraga}
Durasi: ${durasi}
Berat badan: ${beratBadan} kg`
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
      .select('role, is_active, berat_badan')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.is_active === false || profile.role !== 'klien') {
      return new Response(
        JSON.stringify({ error: 'Hanya klien aktif yang dapat menganalisa kalori olahraga.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const beratBadan = typeof profile.berat_badan === 'number' && profile.berat_badan > 0
      ? profile.berat_badan
      : 65

    const body = await req.json().catch(() => null)
    const jenisOlahraga = sanitize(String(body?.jenis_olahraga ?? ''))
    const durasi = sanitize(String(body?.durasi ?? ''))

    if (!jenisOlahraga) {
      return new Response(JSON.stringify({ error: 'Jenis olahraga wajib diisi.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!durasi) {
      return new Response(JSON.stringify({ error: 'Durasi wajib diisi.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (looksLikeGarbage(jenisOlahraga) && looksLikeGarbage(durasi)) {
      return new Response(JSON.stringify({ error: 'Input tidak valid. Isi jenis olahraga dan durasi yang benar.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'Layanan estimasi belum dikonfigurasi.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userMessage = buildUserMessage(jenisOlahraga, durasi, beratBadan)
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
        max_tokens: 200,
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
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return new Response(JSON.stringify({ error: 'Format AI tidak dikenali' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (typeof parsed.kalori_estimasi !== 'number' || Number.isNaN(parsed.kalori_estimasi)) {
      return new Response(JSON.stringify({ error: 'Format respons AI tidak valid' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (parsed.valid === false) {
      const msg = typeof parsed.message === 'string' && parsed.message.trim()
        ? parsed.message.trim()
        : 'Input bukan aktivitas olahraga yang dikenal.'
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const kalori = Math.min(Math.round(parsed.kalori_estimasi), 10000)

    return new Response(
      JSON.stringify({ kalori_estimasi: kalori }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Kesalahan server'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
