import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const MAX_ITEMS = 40
const MIN_JUMLAH = 0.001  // Accept any quantity > 0, no matter how small
const MAX_JUMLAH = 10000
// FIX #1: Dynamic max_tokens based on item count
const BASE_TOKENS = 500
const TOKENS_PER_ITEM = 120
const MAX_TOKENS_CEILING = 4096

// FIX #6: Retry config
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 800

function sanitize(s: string, maxLen = 120): string {
  return s
    .replace(/[\n\r\t\x00-\x1f]/g, ' ')
    // FIX #3: Added apostrophe (') and percent (%) to whitelist
    .replace(/[^\p{L}\p{N}\s.,&()\-/'%]/gu, '')
    .trim()
    .slice(0, maxLen)
}

const SYSTEM_MESSAGE_TEMPLATE = `You are a nutrition analysis assistant for a dietary tracking application. Users log food items with a name, quantity, and unit. Validate each item then estimate nutrition for valid ones.

AVAILABLE UNITS (only suggest these when flagging incompatible units): {{UNITS_LIST}}

=== OUTPUT FORMAT ===

All items valid:
{"valid":true,"items":[{"nama_makanan":"...","kalori":400,"karbohidrat":55.5,"protein":12.3,"lemak":15.2,"serat":2.1,"natrium":800}]}

Any item has a problem:
{"valid":false,"needsClarification":true,"message":"ringkasan semua masalah dalam satu kalimat bahasa Indonesia","invalid_inputs":["..."],"invalid_indices":[0],"item_issues":[{"index":0,"fields":[{"field":"nama_makanan","issue":"vague","message":"pertanyaan klarifikasi dalam bahasa Indonesia"}]}],"items":[]}

=== EXAMPLES ===

Input: 1. Nasi Goreng Spesial - 1 piring / 2. Es Teh Manis - 1 gelas
Output: {"valid":true,"items":[{"nama_makanan":"Nasi Goreng Spesial","kalori":420,"karbohidrat":56.0,"protein":14.0,"lemak":16.0,"serat":2.5,"natrium":850},{"nama_makanan":"Es Teh Manis","kalori":70,"karbohidrat":18.0,"protein":0.0,"lemak":0.0,"serat":0.0,"natrium":5}]}

Input: 1. nasi - 1 piring / 2. keyboard - 1 buah / 3. Teh Botol - 1 potong
Output: {"valid":false,"needsClarification":true,"message":"1 item perlu klarifikasi, 1 item bukan makanan, 1 item memiliki satuan tidak cocok.","invalid_inputs":["nasi","keyboard","Teh Botol"],"invalid_indices":[0,1,2],"item_issues":[{"index":0,"fields":[{"field":"nama_makanan","issue":"vague","message":"Nasi apa yang dimaksud? Nasi putih, nasi goreng, atau nasi uduk?"}]},{"index":1,"fields":[{"field":"nama_makanan","issue":"not_food"}]},{"index":2,"fields":[{"field":"unit_nama","issue":"incompatible"}]}],"items":[]}

=== VALIDATION RULES ===

For each item, check in order:

1. SPECIFICITY — Is the food name specific enough?
   - Multi-word dish names in ANY language → ALWAYS accept if they refer to a recognizable food (e.g. "nasi goreng", "spaghetti bolognese", "fried chicken", "cheese omelette").
   - Single word that unambiguously names one food item in any language (e.g. "bakso", "rendang", "pizza", "oreo", "sushi", "croissant", "tofu", "salt", "cheese") → accept.
   - Brand-name snacks and packaged foods are valid (e.g. "Oreo", "SoyJoy", "Indomie", "Pocky", "KitKat") → accept, estimate based on standard package serving.
   - Single-word generic CATEGORY with no inherent dish identity → flag as vague: "makanan", "minuman", "snack", "cemilan", "buah", "sayur", "lauk", "kue", "food", "drink", "stuff". Write a clarifying question in Indonesian.
   - Exception: if context makes a generic word specific (e.g. "1 centong nasi" → treat as nasi putih, "1 slice pizza" → accept), accept it.

2. IS IT FOOD? — The item must be a real food or beverage consumed by humans, in any cuisine or language. Water and plain beverages (air putih, air mineral, air minum) are ALWAYS valid — they simply have 0 kcal. If the item is a non-food object, abstract concept, or gibberish → flag as not_food (no message needed).

3. UNIT COMPATIBILITY — Reject only clearly absurd pairings:
   - Solid whole foods paired with "sendok teh" or "gelas" → incompatible
   - Beverages or liquids (including air putih, air mineral, jus, teh, kopi, susu) paired with "potong" or "lembar" → incompatible
   - Brothy dishes (bakso, soto, rawon, ramen, soup) with "bungkus" or "gelas" → ACCEPTABLE
   - Water and plain beverages with "gelas", "ml", "liter", "botol" → ALWAYS ACCEPTABLE
   - When flagging, suggest an alternative unit from AVAILABLE UNITS only.

=== ESTIMATION ===

If all items pass validation, estimate nutrition using standard food composition data (Indonesian TKPI for local foods, USDA or manufacturer data for international/packaged foods) and realistic portion sizes.

QUANTITY SCALING — always scale proportionally, no matter how small or large:
- quantity > 1 → multiply base nutrition by quantity
- quantity < 1 (e.g. 0.5, 0.25, 0.1) → multiply base nutrition by quantity
- Examples: 0.5 centong nasi = half a ladle of rice = ~65 kcal; 0.5 sendok makan minyak = ~60 kcal; 0.25 potong ayam goreng = ~59 kcal
- NEVER reject or flag an item solely because the quantity is small. Any quantity > 0 is valid.
- kalori of 0 is only acceptable for items that are genuinely calorie-free (e.g. plain water, unsweetened black tea with no sugar). For all other foods, even tiny quantities must produce a kalori > 0.

Number format:
- kalori: integer (kcal)
- karbohidrat, protein, lemak, serat: 1 decimal place (grams)
- natrium: integer (milligrams)

=== RULES ===
- Process EVERY item. Never skip.
- If ANY item fails: valid=false, item_issues populated, items=[].
- If ALL items pass: valid=true, items populated, no item_issues.
- invalid_indices MUST exactly match the set of index values present in item_issues. Never include an index in invalid_indices that does not have a corresponding entry in item_issues, and vice versa.
- Output ONLY the JSON. No preamble, no markdown.`

type AnalyzeInputItem = { nama_makanan: string; jumlah: number; unit_nama: string }

function buildUserMessage(items: AnalyzeInputItem[]) {
  const lines = items.map((x, i) => {
    return `${i + 1}. ${x.nama_makanan} - ${x.jumlah} ${x.unit_nama}`
  })
  if (items.length === 1) return `Input:\n${lines[0]}`
  return `Inputs:\n${lines.join('\n')}`
}

type NutritionItem = {
  nama_makanan: string
  kalori: number
  karbohidrat: number
  protein: number
  lemak: number
  serat: number
  natrium: number
}

type IssueField = {
  field: string
  issue: string
  message?: string
}

type ItemIssue = {
  index: number
  fields: IssueField[]
}

type AnalyzeResult = {
  valid: boolean
  needsClarification?: boolean
  message?: string
  invalid_inputs?: string[]
  invalid_indices?: number[]
  item_issues?: ItemIssue[]
  items?: NutritionItem[]
}

function isAnalyzeResult(x: unknown): x is AnalyzeResult {
  if (x == null || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  if (typeof obj.valid !== 'boolean') return false

  if (obj.valid === true) {
    if (!Array.isArray(obj.items)) return false
    if (!obj.items.every(isNutritionItem)) return false
    return true
  }

  // FIX #2: Ensure items is empty array when valid=false
  if (Array.isArray(obj.items) && obj.items.length > 0) return false

  if (typeof obj.message !== 'string' || !obj.message.trim()) return false
  if (obj.needsClarification !== undefined && typeof obj.needsClarification !== 'boolean')
    return false

  if (obj.invalid_inputs !== undefined) {
    if (
      !Array.isArray(obj.invalid_inputs) ||
      !obj.invalid_inputs.every((v: unknown) => typeof v === 'string')
    )
      return false
  }

  if (obj.invalid_indices !== undefined) {
    if (
      !Array.isArray(obj.invalid_indices) ||
      !obj.invalid_indices.every(
        (v: unknown) => typeof v === 'number' && Number.isFinite(v),
      )
    )
      return false
  }

  if (obj.item_issues !== undefined) {
    if (!Array.isArray(obj.item_issues)) return false
    if (!obj.item_issues.every(isItemIssue)) return false
  }

  // FIX #4: Validate invalid_indices and item_issues are in sync
  if (obj.invalid_indices !== undefined && obj.item_issues !== undefined) {
    const issueIndexSet = new Set(
      (obj.item_issues as ItemIssue[]).map((i) => i.index),
    )
    const invalidIndices = obj.invalid_indices as number[]
    const allIndicesHaveIssues = invalidIndices.every((i) => issueIndexSet.has(i))
    const allIssuesInIndices = [...issueIndexSet].every((i) =>
      invalidIndices.includes(i),
    )
    if (!allIndicesHaveIssues || !allIssuesInIndices) return false
  }

  return true
}

function isNutritionItem(x: unknown): x is NutritionItem {
  if (x == null || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  return (
    typeof obj.nama_makanan === 'string' &&
    obj.nama_makanan.trim().length > 0 &&
    typeof obj.kalori === 'number' &&
    Number.isFinite(obj.kalori) &&
    typeof obj.karbohidrat === 'number' &&
    Number.isFinite(obj.karbohidrat) &&
    typeof obj.protein === 'number' &&
    Number.isFinite(obj.protein) &&
    typeof obj.lemak === 'number' &&
    Number.isFinite(obj.lemak) &&
    typeof obj.serat === 'number' &&
    Number.isFinite(obj.serat) &&
    typeof obj.natrium === 'number' &&
    Number.isFinite(obj.natrium)
  )
}

function isItemIssue(x: unknown): x is ItemIssue {
  if (x == null || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  if (typeof obj.index !== 'number' || !Number.isFinite(obj.index)) return false
  if (!Array.isArray(obj.fields)) return false
  return obj.fields.every(isIssueField)
}

function isIssueField(x: unknown): x is IssueField {
  if (x == null || typeof x !== 'object') return false
  const obj = x as Record<string, unknown>
  if (typeof obj.field !== 'string') return false
  if (typeof obj.issue !== 'string') return false
  if (obj.message !== undefined && typeof obj.message !== 'string') return false
  return true
}

function tryExtractJson(text: string): unknown | null {
  const raw = text.replace(/```(?:json)?|```/gi, '').trim()
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    // fallthrough
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

  return null
}

// FIX #6: Retry helper with exponential-ish backoff
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number,
): Promise<Response> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options)
      // Only retry on 5xx or network-level errors, not 4xx
      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      return res
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
      }
    }
  }
  throw lastError ?? new Error('Request failed after retries')
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
        JSON.stringify({ error: 'Hanya klien aktif yang dapat menganalisa makanan.' }),
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
      return new Response(
        JSON.stringify({ error: `Maksimal ${MAX_ITEMS} item per permintaan.` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const parsedItems: AnalyzeInputItem[] = rawItems
      .map((x) => {
        if (x == null || typeof x !== 'object') return null
        const obj = x as Record<string, unknown>
        const rawName = obj.nama_makanan ?? obj.nama ?? obj.name
        const rawUnit = obj.unit_nama ?? obj.unit ?? obj.unitName
        const nama_makanan = sanitize(String(rawName ?? ''))
        const unit_nama = sanitize(String(rawUnit ?? ''), 50)
        const jumlah = Number(obj.jumlah)
        if (!nama_makanan || !unit_nama || !Number.isFinite(jumlah) || jumlah < MIN_JUMLAH)
          return null
        return { nama_makanan, jumlah: Math.min(jumlah, MAX_JUMLAH), unit_nama }
      })
      .filter((x): x is AnalyzeInputItem => Boolean(x))
      .slice(0, MAX_ITEMS)

    if (!parsedItems.length) {
      return new Response(
        JSON.stringify({ error: 'Setiap baris wajib berisi nama, jumlah, dan satuan.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (rawItems.some((x: Record<string, unknown>) => Number(x.jumlah) > MAX_JUMLAH)) {
      return new Response(
        JSON.stringify({ error: 'Jumlah melebihi batas maksimum (10.000).' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'Layanan analisa belum dikonfigurasi.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: units } = await supabase
      .from('food_units')
      .select('nama')
      .order('nama')

    const unitNames = units?.map((u) => u.nama).join(', ') || ''
    const SYSTEM_MESSAGE = SYSTEM_MESSAGE_TEMPLATE.replace(/{{UNITS_LIST}}/g, unitNames)

    const userMessage = buildUserMessage(parsedItems)
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

    // FIX #1: Dynamic max_tokens based on item count
    const maxTokens = Math.min(
      BASE_TOKENS + parsedItems.length * TOKENS_PER_ITEM,
      MAX_TOKENS_CEILING,
    )

    // FIX #6: Use fetchWithRetry instead of plain fetch
    const oaiRes = await fetchWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_MESSAGE },
            { role: 'user', content: userMessage },
          ],
          temperature: 0,
          max_tokens: maxTokens,
        }),
      },
      MAX_RETRIES,
    )

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

    // FIX #1: Detect truncated response (finish_reason = 'length')
    const finishReason = oaiData.choices?.[0]?.finish_reason
    if (finishReason === 'length') {
      return new Response(
        JSON.stringify({ error: 'Respons AI terpotong. Coba kurangi jumlah item.' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const parsed = tryExtractJson(raw)
    if (!parsed || !isAnalyzeResult(parsed)) {
      return new Response(JSON.stringify({ error: 'Format AI tidak dikenali' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (parsed.valid) {
      return new Response(JSON.stringify(parsed.items), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resp: Record<string, unknown> = {
      valid: false,
      message: parsed.message,
      needsClarification: parsed.needsClarification ?? false,
    }
    if (parsed.invalid_inputs?.length) resp.invalid_inputs = parsed.invalid_inputs
    if (parsed.invalid_indices?.length) resp.invalid_indices = parsed.invalid_indices
    if (parsed.item_issues?.length) resp.item_issues = parsed.item_issues

    return new Response(JSON.stringify(resp), {
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
