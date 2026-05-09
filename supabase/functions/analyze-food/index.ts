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

function sanitize(s: string, maxLen = 120): string {
  return s
    .replace(/[\n\r\t\x00-\x1f]/g, ' ')
    .replace(/[^\p{L}\p{N}\s.,&()\-/]/gu, '')
    .trim()
    .slice(0, maxLen)
}

const SYSTEM_MESSAGE = `You are a nutrition analysis assistant for a dietary tracking application. Your users log Indonesian foods with a name, quantity, and unit. Your job: validate every item — check if it is specific enough, is real food, and has a compatible unit — then estimate nutrition for valid items.

RESPOND WITH A SINGLE JSON OBJECT. Never include text outside the JSON.

=== RESPONSE FORMAT ===

When ALL items are valid (specific food, compatible unit):
{
  "valid": true,
  "items": [
    {
      "nama_makanan": "Nasi Goreng",
      "kalori": 400,
      "karbohidrat": 55.5,
      "protein": 12.3,
      "lemak": 15.2,
      "serat": 2.1,
      "natrium": 800
    }
  ]
}

When ANY item has a problem:
{
  "valid": false,
  "needsClarification": true,
  "message": "one-sentence summary of all issues in Indonesian",
  "invalid_inputs": ["problem text 1", "problem text 2"],
  "invalid_indices": [0, 2],
  "item_issues": [
    {
      "index": 0,
      "fields": [
        {
          "field": "nama_makanan",
          "issue": "vague",
          "message": "clarifying question in Indonesian"
        }
      ]
    }
  ]
}

=== FEW-SHOT EXAMPLES ===

Example 1 — all valid:
Input:
1. Nasi Goreng Spesial - 1 piring
2. Es Teh Manis - 1 gelas

Output:
{
  "valid": true,
  "items": [
    { "nama_makanan": "Nasi Goreng Spesial", "kalori": 420, "karbohidrat": 56.0, "protein": 14.0, "lemak": 16.0, "serat": 2.5, "natrium": 850 },
    { "nama_makanan": "Es Teh Manis", "kalori": 70, "karbohidrat": 18.0, "protein": 0.0, "lemak": 0.0, "serat": 0.0, "natrium": 5 }
  ]
}

Example 2 — mixed issues:
Input:
1. nasi - 1 piring
2. keyboard - 1 buah
3. Teh Botol - 1 potong

Output:
{
  "valid": false,
  "needsClarification": true,
  "message": "1 item perlu klarifikasi, 1 item bukan makanan, 1 item memiliki satuan tidak cocok.",
  "invalid_inputs": ["nasi", "keyboard", "Teh Botol"],
  "invalid_indices": [0, 1, 2],
  "item_issues": [
    {
      "index": 0,
      "fields": [{ "field": "nama_makanan", "issue": "vague", "message": "Nasi apa yang dimaksud? Nasi putih, nasi goreng, nasi uduk?" }]
    },
    {
      "index": 1,
      "fields": [{ "field": "nama_makanan", "issue": "not_food" }]
    },
    {
      "index": 2,
      "fields": [{ "field": "unit_nama", "issue": "incompatible" }]
    }
  ]
}

=== STEP-BY-STEP PROCESS ===

Before outputting JSON, mentally process each input item in order:
1. Is the food name specific enough? If it's a single generic word ("nasi", "sayur", "lauk", "kue", "minuman", "makanan", "cemilan", "buah", "jajan", "snack", "sarapan"), or very short (≤3 meaningful characters), or ambiguous ("makanan berat", "yang tadi", "sesuatu yang enak") → flag as vague (issue: "vague", field: "nama_makanan", needsClarification: true). Write a helpful clarifying question in Indonesian.
2. Is it human food/beverage? If it's a non-food object, abstract concept, or gibberish → flag as not_food (field: "nama_makanan", issue: "not_food", needsClarification: false).
3. Is the unit compatible with the food's physical form? Use flexible judgment — accept reasonable pairings even if uncommon. Reject only clearly absurd combinations: solid whole foods with "sendok teh" or "gelas", beverages with "potong" or "lembar". Brothy dishes (soto, bakso kuah, rawon) with "porsi"/"mangkuk"/"bungkus" are ACCEPTABLE. Traditional/regional foods remain valid. → flag as incompatible (field: "unit_nama", issue: "incompatible").
4. If the item passes all three checks, estimate its nutrition.

Note: when the food name already implies a unit implicitly used in context (e.g. "1 centong nasi" — treat "nasi" here as specific enough, defaulting to nasi putih), apply step 4 directly. Only flag "nasi" alone as vague.

=== ESTIMATION FOR VALID ITEMS ===

Base estimates on Indonesian food composition data (TKPI) and realistic portion sizes. Scale proportionally when quantity > 1.

Realistic Indonesian portion baselines:
- 1 centong nasi (white rice ladle, ~75g) = 130 kcal, carbs 28.0g, protein 2.5g, fat 0.3g
- 1 piring nasi (~150g) = 260 kcal, carbs 56.0g, protein 5.0g, fat 0.6g
- 1 porsi nasi goreng = 380–450 kcal (varies by toppings)
- 1 potong ayam goreng (dada, ~100g) = 250 kcal, protein 30.0g, fat 14.0g
- 1 potong ayam goreng (paha, ~80g) = 220 kcal, protein 22.0g, fat 13.0g
- 1 potong tempe goreng (~50g) = 170 kcal, protein 10.0g, fat 10.0g, carbs 8.0g
- 1 potong tahu goreng (~50g) = 120 kcal, protein 8.0g, fat 8.0g, carbs 4.0g
- 1 gelas teh manis (250ml, 2 tsp sugar) = 70 kcal, carbs 18.0g
- 1 bungkus nasi padang komplit = 650–800 kcal
- 1 mangkuk bakso (5 meatballs + noodles + broth) = 350 kcal
- 1 porsi soto ayam = 300 kcal
- 1 potong pisang goreng = 120 kcal
- 1 bungkus indomie goreng (cooked) = 450 kcal
- 1 gelas susu (250ml) = 150 kcal, protein 8.0g, fat 7.0g, carbs 12.0g
- 1 butir telur ceplok (fried egg) = 90 kcal, protein 6.5g, fat 7.0g
- 1 potong ikan goreng (~80g) = 180 kcal, protein 20.0g, fat 10.0g
- 1 buah pisang ambon (~100g) = 100 kcal, carbs 25.0g

For fried foods: add ~8–15% weight as absorbed oil.
For brothy dishes: estimate solids + broth separately, account for both.
For packaged foods: estimate per standard Indonesian package size.

Nutrient type rules:
- kalori: whole number (kcal)
- karbohidrat, protein, lemak, serat: 1 decimal place (grams)
- natrium: whole number (milligrams)

=== CRITICAL RULES ===
- Process EVERY item. Never skip or omit an item from the output.
- If ANY item has a problem, the entire response must be valid: false with item_issues. In that case, items must be an empty array [].
- If ALL items are valid, the entire response must be valid: true with every item estimated in "items" (same order as input).
- Never mix: you either return item_issues (with empty items) OR return items (with no item_issues).
- The "message" field (valid: false) must be a single Indonesian sentence summarizing all issues.
- Output ONLY the JSON. No preamble, no explanation, no markdown.`

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

  if (typeof obj.message !== 'string' || !obj.message.trim()) return false
  if (obj.needsClarification !== undefined && typeof obj.needsClarification !== 'boolean')
    return false

  if (obj.invalid_inputs !== undefined) {
    if (!Array.isArray(obj.invalid_inputs) || !obj.invalid_inputs.every((v: unknown) => typeof v === 'string'))
      return false
  }

  if (obj.invalid_indices !== undefined) {
    if (!Array.isArray(obj.invalid_indices) || !obj.invalid_indices.every((v: unknown) => typeof v === 'number' && Number.isFinite(v)))
      return false
  }

  if (obj.item_issues !== undefined) {
    if (!Array.isArray(obj.item_issues)) return false
    if (!obj.item_issues.every(isItemIssue)) return false
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
      return new Response(JSON.stringify({ error: `Maksimal ${MAX_ITEMS} item per permintaan.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
        if (!nama_makanan || !unit_nama || !Number.isFinite(jumlah) || jumlah <= 0)
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

    const userMessage = buildUserMessage(parsedItems)
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

    const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
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
        temperature: 0.2,
        max_tokens: 1600,
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

    // Return error object with item_issues
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
