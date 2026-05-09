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

const SYSTEM_MESSAGE = `You are a sports nutritionist. Estimate calories burned based on physical activity type and duration. Your user provides a body weight in kg, an activity name (in Indonesian or English), and a duration string (mixed formats).

Respond with a SINGLE JSON OBJECT. Never include text outside the JSON.

=== RESPONSE FORMAT ===

When input is valid:
{ "kalori_estimasi": 285 }

When input is INVALID (activity type OR duration is genuinely nonsensical):
{ "kalori_estimasi": 0, "valid": false, "message": "Brief reason in Indonesian." }

=== FEW-SHOT EXAMPLES ===

Example 1 — valid:
User: Jenis olahraga: Lari pagi\nDurasi: 30 menit\nBerat badan: 70 kg
Output: { "kalori_estimasi": 280 }

Example 2 — valid with complex duration:
User: Jenis olahraga: Bersepeda santai\nDurasi: 1 jam 15 menit\nBerat badan: 65 kg
Output: { "kalori_estimasi": 325 }

Example 3 — invalid:
User: Jenis olahraga: meja\nDurasi: 10 menit\nBerat badan: 70 kg
Output: { "kalori_estimasi": 0, "valid": false, "message": ""meja" bukan aktivitas fisik yang membakar kalori." }

=== STEP-BY-STEP PROCESS ===

1. Validate the activity name:
   - ACCEPT anything that involves bodily movement: sports, housework, sexual activity, manual labor, playing, dancing, martial arts, climbing, hiking, diving, walking, cycling, swimming, etc.
   - REJECT only: gibberish (e.g. "asdasd", "oke", "xyz123"), inanimate objects (e.g. "meja", "mobil", "laptop"), or purely sedentary non-movement (e.g. "tidur", "nonton TV", "baca buku").
   - When in doubt between valid and invalid, choose VALID.

2. Parse the duration and convert to minutes:
   - "30 menit" → 30 minutes
   - "1 jam" → 60 minutes
   - "1 jam 30 menit" → 90 minutes
   - "90 jam" → 5400 minutes
   - "2 hari" → 2880 minutes
   - "3 set" / "3 putaran" / "3 sesi" → estimate ~15–20 active minutes per set based on activity type
   - "100 reps" / "100 repetisi" → estimate duration based on reasonable rep speed for that activity
   - "5 km" (running) → estimate ~25–30 minutes for recreational runner
   - "10 km" (cycling) → estimate ~30 minutes for casual cyclist
   - Always produce a duration. Only mark invalid if the duration string is pure gibberish (e.g. "warna hijau", "zzzz").

3. Assign a MET value:
   - Running (8 km/h): 8 | Running (10 km/h): 10 | Jogging: 6
   - Brisk walking (6 km/h): 5 | Casual walking: 3
   - Cycling moderate (20 km/h): 8 | Cycling leisurely: 4
   - Swimming moderate: 7 | Swimming leisurely: 5
   - Aerobics / gymnastics: 6 | Intense aerobics: 8
   - Yoga: 3 | Pilates: 3.5
   - Weight training moderate: 5 | Heavy weight training: 6
   - Badminton: 5.5 | Tennis: 7 | Table tennis: 4
   - Soccer: 8 | Futsal: 7
   - Basketball: 6.5 | Volleyball: 4
   - Jump rope / skipping: 10
   - HIIT / CrossFit: 8
   - Zumba / dancing: 7.5
   - Rock climbing: 8
   - Hiking / mountain climbing: 7
   - Martial arts (karate, taekwondo, silat, boxing): 10
   - Sexual activity moderate: 4 | Active: 5.5 | Light: 2.5
   - House cleaning (mopping, sweeping): 3.5
   - Gardening: 4
   - Painting / renovation: 4.5
   - Stretching: 2.5
   - Unknown but plausible physical activity: 4 (light intensity) or 6 (moderate-heavy) — choose the best fit.

4. Calculate: calories = MET × body_weight_kg × (duration_minutes / 60)

5. Round to whole number. Cap at 10000 per session.

Use the formula exactly. Do not guess or skip the calculation.`

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
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Incomplete server configuration' }), {
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
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
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
        JSON.stringify({ error: 'Only active clients can estimate exercise calories.' }),
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
      return new Response(JSON.stringify({ error: 'Exercise type is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!durasi) {
      return new Response(JSON.stringify({ error: 'Duration is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (looksLikeGarbage(jenisOlahraga) && looksLikeGarbage(durasi)) {
      return new Response(JSON.stringify({ error: 'Invalid input. Enter a valid exercise type and duration.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'Estimation service is not configured.' }), {
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
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    })

    const oaiData = await oaiRes.json()
    if (!oaiRes.ok) {
      const msg =
        typeof oaiData?.error?.message === 'string'
          ? oaiData.error.message
          : 'OpenAI call failed'
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const raw = oaiData.choices?.[0]?.message?.content
    if (typeof raw !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid OpenAI response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return new Response(JSON.stringify({ error: 'Unrecognized AI format' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (typeof parsed.kalori_estimasi !== 'number' || Number.isNaN(parsed.kalori_estimasi)) {
      return new Response(JSON.stringify({ error: 'Invalid AI response format' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (parsed.valid === false) {
      const msg = typeof parsed.message === 'string' && parsed.message.trim()
        ? parsed.message.trim()
        : 'Input is not a recognized physical activity.'
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
    const message = e instanceof Error ? e.message : 'Server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
