# Activity Calorie Estimation: AI Prompt Improvement

**Date:** 2026-05-13
**Status:** Approved

## Problem

The current calorie estimation edge function (`supabase/functions/estimate-exercise-calories/index.ts`) uses a MET-based formula that only accounts for body weight. In reality, calorie expenditure during physical activity is influenced by height, age, and gender. The profiles table stores all of these fields (`tinggi_badan`, `tgl_lahir`, `jenis_kelamin`) but they are unused.

Additionally, the current design asks the AI to both classify activity AND compute calories. This is error-prone — the AI can miscalculate or hallucinate the math. Moving the computation to deterministic TypeScript eliminates this risk.

## Approach

**Pre-compute pattern:** AI classifies activity + assigns MET + parses duration. TypeScript computes calories with biometric adjustments.

### Flow

```
User input (activity, duration)
  → Edge function fetches biometrics (weight, height, age, gender)
  → AI returns { met, duration_minutes } or { valid: false, message }
  → TypeScript computes: base calories × gender factor × age factor × height factor
  → Response
```

## Changes

### 1. Edge function query expansion

```typescript
// Before
.select('role, is_active, berat_badan')

// After
.select('role, is_active, berat_badan, tinggi_badan, tgl_lahir, jenis_kelamin')
```

Age computed from `tgl_lahir`:
```typescript
function computeAge(birthDate: string): number | null {
  if (!birthDate) return null
  const born = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const m = now.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--
  return age
}
```

### 2. AI prompt changes

The prompt is simplified. The AI no longer computes calories.

**New response format:**

```json
// Valid activity
{ "met": 8, "duration_minutes": 30 }

// Invalid activity
{ "met": 0, "valid": false, "message": "Reason in Indonesian." }
```

**Removed from prompt:**
- Step 4 (calorie calculation formula)
- Step 5 (round/cap)
- Few-shot examples showing calorie outputs

**Updated few-shot examples:**

```
Example 1 — valid:
User: Jenis olahraga: Lari pagi\nDurasi: 30 menit
Output: { "met": 8, "duration_minutes": 30 }

Example 2 — complex duration:
User: Jenis olahraga: Bersepeda santai\nDurasi: 1 jam 15 menit
Output: { "met": 4, "duration_minutes": 75 }

Example 3 — invalid:
User: Jenis olahraga: meja\nDurasi: 10 menit
Output: { "met": 0, "valid": false, "message": "\"meja\" bukan aktivitas fisik." }
```

The `buildUserMessage` function no longer includes weight since the AI doesn't need it:

```typescript
function buildUserMessage(jenisOlahraga: string, durasi: string): string {
  return `Jenis olahraga: ${jenisOlahraga}\nDurasi: ${durasi}`
}
```

### 3. TypeScript calorie computation

```typescript
function computeCalories(
  met: number,
  durationMinutes: number,
  weightKg: number,
  gender: string | null,
  age: number | null,
  heightCm: number | null,
): number {
  // Base MET formula
  let calories = met * weightKg * (durationMinutes / 60)

  // Gender adjustment: females burn ~8% less at same weight
  if (gender === 'female') {
    calories *= 0.92
  }

  // Age adjustment: ~0.5% reduction per year over 30, floor at 0.80
  if (age !== null && age > 30) {
    const ageFactor = Math.max(0.80, 1 - 0.005 * (age - 30))
    calories *= ageFactor
  }

  // Height adjustment: only for height-sensitive activities
  // Applied as ±3% per 10cm deviation from reference height (170cm)
  // Only used for bodyweight exercises, swimming, rowing where biomechanics matter
  // For most activities, no height adjustment

  return Math.round(calories)
}
```

**Adjustment factors:**

| Factor | Formula | Fallback |
|--------|---------|----------|
| Gender | Male: ×1.0, Female: ×0.92 | No gender → ×1.0 |
| Age | `1 - 0.005 × max(0, age - 30)`, floor 0.80 | No age → assume 30 (×1.0) |
| Height | ±3% per 10cm from 170cm reference, only for height-sensitive activities | No height → ×1.0 |
| Weight | Existing: fallback to 65kg | No weight → 65kg |

### 4. Height-sensitive activities

Height adjustment applies only to these activity categories (based on biomechanical relevance):

- **Bodyweight exercises:** Push-ups, pull-ups, dips, squats (no weight) — taller people move mass through greater range
- **Swimming:** Taller swimmers have longer strokes, different drag profile
- **Rowing:** Limb length affects stroke mechanics

For all other activities (running, cycling, weightlifting, etc.), height adjustment is skipped because the MET values already account for the body dimensions adequately through weight.

Implementation: classify by checking if the MET value falls into bodyweight-exercise ranges OR if the activity name matches known height-sensitive activities returned by the AI. Since the AI returns a MET value, we add an optional `"height_sensitive": true` field to the AI response.

**Updated AI response format for height-sensitive activities:**
```json
{ "met": 3.5, "duration_minutes": 20, "height_sensitive": true }
```

The AI is instructed to set `height_sensitive: true` for bodyweight exercises, swimming, and rowing.

### 5. Height adjustment logic

```typescript
// Only applied when height_sensitive is true and height is available
if (heightSensitive && heightCm !== null) {
  const referenceHeight = 170
  const deviation = (heightCm - referenceHeight) / 10 // in units of 10cm
  const heightFactor = 1 + 0.03 * deviation // ±3% per 10cm
  calories *= Math.max(0.85, Math.min(1.15, heightFactor)) // clamp to ±15%
}
```

### 6. Response changes

The edge function response format stays the same for the frontend:
```json
{ "kalori_estimasi": 285 }
```

No frontend changes required.

## Files to modify

1. `supabase/functions/estimate-exercise-calories/index.ts` — all changes in this single file

## Testing

- Existing exercise log tests should pass unchanged (same response format)
- New tests should verify:
  - Age adjustment reduces calories for users over 30
  - Gender adjustment reduces calories for female users
  - Height adjustment applies only for height-sensitive activities
  - Fallbacks work when biometric data is missing
  - Calorie cap at 10,000 still enforced
