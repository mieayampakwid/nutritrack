# Anjuran Kalori Harian — Adjusted Calorie Recommendation

**Date:** 2026-05-09
**Status:** Approved

## Overview

Allow ahli gizi to manually input an adjusted daily calorie recommendation ("Anjuran Kalori Harian") alongside the Harris-Benedict calculation result. The adjusted value becomes the calorie ceiling on the klien dashboard chart and in the WhatsApp evaluation summary, while the original HB calculation is preserved as read-only reference.

## Scope

| Area | Uses adjusted value? |
|------|---------------------|
| AssessmentForm (ahli gizi entry) | Input field + read-only HB reference |
| Klien dashboard chart (dotted ReferenceLine) | Yes — `anjuran_kalori_harian ?? energi_total` |
| Klien dashboard bar coloring (green/orange) | Yes — threshold is adjusted value |
| WhatsApp evaluation summary | Yes — adjusted value in message body |
| ClientNutritionSummaryCard | Shows both values when adjusted exists |
| Database | New nullable column on `assessments` |

## Decisions

- **Column name:** `anjuran_kalori_harian` — matches UI label exactly
- **Nullable** — NULL means "not set", consumers fall back to `energi_total`
- **Pre-filled** — input starts with `energi_total` value, ahli gizi adjusts from there
- **No separate logging** — per-session = per assessment row; value stored in the row itself
- **Chart label** — "Anjuran kalori" when adjusted is set, "Target kalori" when using raw HB
- **Backward compatible** — existing assessments with NULL column behave identically to before

## Files Changed

### New: `supabase/migrations/YYYYMMDDHHMMSS_add_anjuran_kalori.sql`

```sql
ALTER TABLE public.assessments
  ADD COLUMN anjuran_kalori_harian numeric(10,2);

COMMENT ON COLUMN public.assessments.anjuran_kalori_harian
  IS 'Manual adjusted daily calorie recommendation set by ahli gizi. Falls back to energi_total when NULL.';
```

### Modified: `supabase/schema.sql`

Add `anjuran_kalori_harian numeric(10,2)` to `assessments` table definition.

### Modified: `src/components/participants/AssessmentForm.jsx`

- Add `anjuran_kalori_harian` to local state, initialized to `energi_total`
- Add numeric input field labeled "Anjuran Kalori Harian" below the read-only HB results panel
- Input pre-filled with `energi_total`, accepts manual numeric override
- Include `anjuran_kalori_harian` in `onSave` payload

### Modified: `src/pages/ahli-gizi/ParticipantAssessment.jsx`

- Pass `anjuran_kalori_harian` from form data into the `assessments` insert mutation

### Modified: `src/components/dashboard/DailyCalorieChart.jsx`

- `targetKcal` reads `latestAssessment.anjuran_kalori_harian ?? latestAssessment.energi_total`
- ReferenceLine label: "Anjuran kalori" when `anjuran_kalori_harian` is set, "Target kalori" otherwise
- Bar coloring threshold uses `targetKcal` (already the case — no change needed)

### Modified: `src/components/clients/ClientQuickSummaryModal.jsx`

- WhatsApp message `energy` uses `latestAssessment.anjuran_kalori_harian ?? latestAssessment.energi_total`
- Label "Kebutuhan Kalori Harian" unchanged

### Modified: `src/components/clients/ClientNutritionSummaryCard.jsx`

- Display adjusted value when set, with "dari anjuran" note
- Show original `energi_total` as secondary reference

## Component Interactions

```
AssessmentForm
  (calculates energi_total, displays as read-only)
  (anjuran_kalori_harian input, pre-filled)
      │
      ▼ onSave({ ...payload, anjuran_kalori_harian })
ParticipantAssessment
  (inserts into assessments table)
      │
      ▼ assessments.anjuran_kalori_harian (nullable)
      │
      ├──► DailyCalorieChart       (anjuran ?? energi_total → dotted line + bar threshold)
      ├──► ClientQuickSummaryModal (anjuran ?? energi_total → WhatsApp message)
      └──► ClientNutritionSummaryCard (shows both)
```

## Testing

- `AssessmentForm` — renders anjuran input pre-filled, includes in save payload
- `DailyCalorieChart` — uses adjusted value when present, falls back to `energi_total`
- `ClientQuickSummaryModal` — WhatsApp message body includes adjusted value
- `ClientNutritionSummaryCard` — displays both values when adjusted exists
