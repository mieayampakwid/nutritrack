import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const MAX_ITEMS = 40
const MAX_NAME_LEN = 120
const MAX_UNIT_LEN = 40

function normalizeUnit(unit: string) {
  return unit
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function sanitize(s: string, maxLen = MAX_NAME_LEN): string {
  return s
    .replace(/[\n\r\t\x00-\x1f]/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,&()\-/]/gu, '')
    .trim()
    .slice(0, maxLen)
}

function buildSystemMessage(allowedUnitsText: string) {
  return `Anda adalah asisten validasi makanan untuk aplikasi pemantauan nutrisi.
Tugas Anda adalah menentukan apakah input pengguna merupakan makanan/minuman manusia yang valid
dan dapat dinilai nilai gizinya. Selain itu, periksa apakah satuan porsi yang dipilih masuk akal
untuk makanan tersebut.

Satuan yang diizinkan untuk dipilih pengguna (gunakan hanya daftar ini):
- ${allowedUnitsText || '(tidak tersedia)'}

Jika input BUKAN makanan/minuman manusia yang valid (mis. benda non-makanan, konsep abstrak,
gibberish, atau input bercanda), balas dengan:
{
  "valid": false,
  "message": "\\"[input]\\" sepertinya bukan makanan/minuman yang bisa kami nilai. Silakan masukkan makanan atau hidangan yang nyata agar kami dapat menghitung nilai gizinya."
}

Jika makanannya valid tetapi satuannya TIDAK cocok/masuk akal (contoh: makanan padat utuh seperti bakso disetarakan dengan "sendok makan"), balas dengan:
{
  "valid": false,
  "message": "Satuan untuk \\"[input]\\" tidak cocok. Pilih satuan yang lebih sesuai (mis. bungkus/potong/buah/lembar/gelas/centong) agar perhitungan lebih akurat."
}

Jika input ADALAH makanan/minuman manusia yang valid, balas dengan:
{
  "valid": true
}

Bersikap tegas tetapi adil. Makanan daerah/tradisional tetap valid.
Untuk hidangan berkuah/berporsi seperti soto, sup, bakso kuah, mie, bubur:
- Satuan seperti porsi/mangkuk/gelas/bungkus bisa masuk akal tergantung konteks.
- Jangan menolak hanya karena tidak yakin; tolak hanya bila satuannya jelas tidak masuk akal.

Jika diberikan beberapa input sekaligus, tetap balas HANYA SATU JSON object:
- valid=true bila SEMUA input adalah makanan/minuman manusia yang valid
- valid=false bila ADA minimal satu input yang tidak valid atau satuan yang tidak cocok, dan "message" harus menyebutkan input mana yang bermasalah
- jika valid=false dan ada beberapa input, sertakan juga:
  - "invalid_inputs": array string dari input yang tidak valid (gunakan persis input yang kamu anggap tidak valid)
  - "invalid_indices": array number (0-based) posisi input yang tidak valid dalam daftar yang diberikan

Catatan:
- Satuan yang mungkin hanyalah yang ada di daftar satuan yang diizinkan di atas.
- Jika satuan tidak tercantum dalam daftar itu atau tidak jelas, anggap tidak valid.

Balas hanya dalam JSON. Jangan berikan penjelasan di luar JSON.`
}

type ValidateInputItem = { nama_makanan: string; unit_nama?: string | null }

function buildUserMessage(items: ValidateInputItem[]) {
  const lines = items.map((x, i) => {
    const name = x.nama_makanan
    const unit = x.unit_nama ? ` | unit: ${x.unit_nama}` : ''
    return `${i + 1}. ${name}${unit}`
  })
  if (items.length === 1) return `Input:\n${lines[0]}`
  return `Inputs:\n${lines.join('\n')}`
}

type ValidateResult = { valid: boolean; message?: string }

function isValidateResult(x: unknown): x is ValidateResult {
  return (
    x != null &&
    typeof x === 'object' &&
    'valid' in x &&
    typeof (x as { valid: unknown }).valid === 'boolean' &&
    (!('message' in x) || typeof (x as { message?: unknown }).message === 'string')
  )
}

type ValidatePerItem = { valid: boolean; message?: string; input?: string }

function looksLikeValidatePerItem(x: unknown): x is ValidatePerItem {
  return (
    x != null &&
    typeof x === 'object' &&
    'valid' in x &&
    typeof (x as { valid: unknown }).valid === 'boolean' &&
    (!('message' in x) || typeof (x as { message?: unknown }).message === 'string') &&
    (!('input' in x) || typeof (x as { input?: unknown }).input === 'string')
  )
}

function tryExtractJson(text: string): unknown | null {
  const raw = text.replace(/```(?:json)?|```/gi, '').trim()
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    // fallthrough: sometimes the model returns extra text around JSON
  }

  const firstObj = raw.indexOf('{')
  const lastObj = raw.lastIndexOf('}')
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    const slice = raw.slice(firstObj, lastObj + 1)
    try {
      return JSON.parse(slice)
    } catch {
      // keep trying
    }
  }

  const firstArr = raw.indexOf('[')
  const lastArr = raw.lastIndexOf(']')
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    const slice = raw.slice(firstArr, lastArr + 1)
    try {
      return JSON.parse(slice)
    } catch {
      // noop
    }
  }

  return null
}

type ValidateResultV2 = {
  valid: boolean
  message?: string
  invalid_inputs?: string[]
  invalid_indices?: number[]
}

function isValidateResultV2(x: unknown): x is ValidateResultV2 {
  if (!isValidateResult(x)) return false
  const obj = x as Record<string, unknown>
  if ('invalid_inputs' in obj) {
    if (
      obj.invalid_inputs != null &&
      (!Array.isArray(obj.invalid_inputs) || !obj.invalid_inputs.every((v) => typeof v === 'string'))
    )
      return false
  }
  if ('invalid_indices' in obj) {
    if (
      obj.invalid_indices != null &&
      (!Array.isArray(obj.invalid_indices) ||
        !obj.invalid_indices.every((v) => typeof v === 'number' && Number.isFinite(v)))
    )
      return false
  }
  return true
}

function uniqueCompact(list: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const s = String(raw ?? '').trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

function foldValidateResult(parsed: unknown, displayItems: string[]): ValidateResultV2 | null {
  if (isValidateResult(parsed)) return parsed

  // Some models respond with per-item array. Fold it into a single verdict.
  if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(looksLikeValidatePerItem)) {
    const invalids = parsed
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.valid === false)

    if (invalids.length === 0) return { valid: true }

    const listed = invalids
      .map(({ r, idx }) => r.input?.trim() || displayItems[idx] || `Item #${idx + 1}`)
      .filter(Boolean)
      .slice(0, 6)
      .join(', ')

    const msgFromModel = invalids.map(({ r }) => r.message?.trim()).find(Boolean)
    const message =
      msgFromModel ||
      (listed
        ? `"${listed}" sepertinya bukan makanan/minuman yang bisa kami nilai. Silakan masukkan makanan atau hidangan yang nyata agar kami dapat menghitung nilai gizinya.`
        : 'Ada input yang bukan makanan/minuman yang bisa kami nilai. Silakan periksa kembali.')

    const invalid_inputs = uniqueCompact(
      invalids
        .map(({ r, idx }) => r.input?.trim() || displayItems[idx] || '')
        .filter(Boolean),
    ).slice(0, 12)
    const invalid_indices = invalids.map(({ idx }) => idx).slice(0, 40)

    return { valid: false, message, invalid_inputs, invalid_indices }
  }

  // Some models wrap results: { result: {...} } or { results: [...] }
  if (parsed != null && typeof parsed === 'object') {
    const maybe = parsed as Record<string, unknown>
    if (isValidateResultV2(maybe.result)) return maybe.result
    if (Array.isArray(maybe.results)) return foldValidateResult(maybe.results, displayItems)
    if (Array.isArray(maybe.data)) return foldValidateResult(maybe.data, displayItems)
  }

  return null
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

    if (!profile || profile.is_active === false || profile.role !== 'klien') {
      return new Response(
        JSON.stringify({ error: 'Hanya klien aktif yang dapat memvalidasi makanan.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const body = await req.json().catch(() => null)
    const rawItems = body?.items
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Data tidak valid.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (rawItems.length > MAX_ITEMS) {
      return new Response(JSON.stringify({ error: `Maksimal ${MAX_ITEMS} item per permintaan.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parsedItems: ValidateInputItem[] = rawItems
      .map((x) => {
        if (typeof x === 'string') {
          const nama_makanan = sanitize(x)
          return nama_makanan ? { nama_makanan } : null
        }
        if (x != null && typeof x === 'object') {
          const obj = x as Record<string, unknown>
          const rawName = obj.nama_makanan ?? obj.nama ?? obj.name
          const rawUnit = obj.unit_nama ?? obj.unit ?? obj.unitName
          const nama_makanan = sanitize(String(rawName ?? ''))
          const unit_nama = sanitize(String(rawUnit ?? ''), MAX_UNIT_LEN)
          if (!nama_makanan) return null
          if (unit_nama) return { nama_makanan, unit_nama }
          return { nama_makanan }
        }
        return null
      })
      .filter((x): x is ValidateInputItem => Boolean(x))
      .slice(0, MAX_ITEMS)

    if (!parsedItems.length) {
      return new Response(JSON.stringify({ error: 'Data tidak valid.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load allowed units from DB so it stays in sync with FoodUnitMaster.
    const { data: unitRows, error: unitErr } = await supabase
      .from('food_units')
      .select('nama')
      .order('nama')
      .limit(500)
    if (unitErr) {
      return new Response(JSON.stringify({ error: 'Gagal memuat daftar satuan.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const allowedUnits = new Set(
      (unitRows ?? [])
        .map((u) => normalizeUnit(String(u?.nama ?? '')))
        .filter(Boolean),
    )
    const allowedUnitsText = (unitRows ?? [])
      .map((u) => String(u?.nama ?? '').trim())
      .filter(Boolean)
      .slice(0, 60)
      .join(', ')

    // If any item includes a unit, require all units to be present and in the allowed list.
    const anyHasUnit = parsedItems.some((x) => Boolean(x.unit_nama))
    if (anyHasUnit) {
      const badIdx: number[] = []
      const badInputs: string[] = []
      for (let i = 0; i < parsedItems.length; i++) {
        const it = parsedItems[i]
        const unit = it.unit_nama ? normalizeUnit(it.unit_nama) : ''
        if (!unit || !allowedUnits.has(unit)) {
          badIdx.push(i)
          badInputs.push(`${it.nama_makanan}${it.unit_nama ? ` | unit: ${it.unit_nama}` : ''}`)
        }
      }
      if (badIdx.length > 0) {
        const messageBase = 'Satuan tidak valid atau belum didukung.'
        const listHint = allowedUnitsText ? ` Pilih salah satu: ${allowedUnitsText}.` : ''
        return new Response(
          JSON.stringify({
            valid: false,
            message: `${messageBase}${listHint}`.slice(0, 420),
            invalid_indices: badIdx,
            invalid_inputs: badInputs.slice(0, 12),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'Layanan validasi belum dikonfigurasi.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userMessage = buildUserMessage(parsedItems)
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
    const systemMessage = buildSystemMessage(allowedUnitsText)

    const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.0,
        max_tokens: 220,
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

    const parsed = tryExtractJson(raw)
    const displayItems = parsedItems.map((x) =>
      x.unit_nama ? `${x.nama_makanan} | unit: ${x.unit_nama}` : x.nama_makanan,
    )
    const folded = parsed == null ? null : foldValidateResult(parsed, displayItems)
    if (!folded) {
      return new Response(JSON.stringify({ error: 'Format AI tidak dikenali' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (folded.valid === false && (!folded.message || !folded.message.trim())) {
      return new Response(JSON.stringify({ error: 'Format AI tidak dikenali' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // NOTE: Keep compatibility: callers may only read { valid, message }.
    // New callers can use invalid_inputs / invalid_indices for per-item highlighting.
    return new Response(JSON.stringify(folded), {
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

