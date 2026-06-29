# Feature Spec: Water Intake Tracking & BB Sync

**Project:** LAPER (NutriTrack)  
**List:** laper prototype - Penyempurnaan fitur di prototype  
**Tasks:** #17–#20  
**Assignee:** Adheraprabu Bagaskhara  
**Branch:** `feat/water-intake-bb-sync`

---

## Part A — Sync `profiles.berat_badan` from Assessments

### Problem

`profiles.berat_badan`, `body_measurements.berat_badan`, and `assessments.berat_badan` are fully decoupled. When an ahli gizi creates an assessment, BB is written only to `assessments`. No mechanism copies it back to `profiles`.

### Solution

Database trigger — fires `AFTER INSERT` on `assessments`, copies `berat_badan` to `profiles` when non-null.

**Why trigger, not frontend:** catches all insert paths (ParticipantAssessment, ClientUserDataEntry, future edge functions). No frontend changes needed.

### Migration: `supabase/migrations/20260624_sync_profile_bb_from_assessment.sql`

```sql
CREATE OR REPLACE FUNCTION public.sync_profile_bb_from_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.berat_badan IS NOT NULL THEN
    UPDATE profiles SET berat_badan = NEW.berat_badan
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessments_sync_profile_bb ON public.assessments;
CREATE TRIGGER trg_assessments_sync_profile_bb
  AFTER INSERT ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_bb_from_assessment();

GRANT ALL ON FUNCTION public.sync_profile_bb_from_assessment() TO anon;
GRANT ALL ON FUNCTION public.sync_profile_bb_from_assessment() TO authenticated;
GRANT ALL ON FUNCTION public.sync_profile_bb_from_assessment() TO service_role;

-- Backfill existing users
UPDATE public.profiles p SET berat_badan = (
  SELECT a.berat_badan FROM public.assessments a
  WHERE a.user_id = p.id AND a.berat_badan IS NOT NULL
  ORDER BY a.created_at DESC LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.user_id = p.id AND a.berat_badan IS NOT NULL
);
```

### Files

| Action | File |
|--------|------|
| New | `supabase/migrations/20260624_sync_profile_bb_from_assessment.sql` |
| Update | `supabase/schema.sql` — append function + trigger + grants |

---

## Part B — Water Intake Tracking

### Data Model

```sql
-- Main table
CREATE TABLE public.water_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tanggal date NOT NULL DEFAULT current_date,
  volume_ml integer NOT NULL CHECK (volume_ml > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX water_intakes_user_tanggal_idx
  ON public.water_intakes (user_id, tanggal DESC);

-- Audit table (mirrors food_log_deletions / exercise_log_deletions)
CREATE TABLE public.water_intake_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  water_intake_id uuid NOT NULL,
  volume_ml integer NOT NULL,
  tanggal date NOT NULL,
  created_at timestamptz NOT NULL,
  deleted_at timestamptz DEFAULT now()
);
```

```sql
-- RLS: main table
ALTER TABLE public.water_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_intakes_self" ON public.water_intakes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "water_intakes_staff" ON public.water_intakes
  FOR SELECT USING (public.jwt_is_staff());

-- RLS: audit table
ALTER TABLE public.water_intake_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_deletions_klien_insert" ON public.water_intake_deletions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "water_deletions_staff_select" ON public.water_intake_deletions
  FOR SELECT USING (public.jwt_is_staff());
```

---

### #17 — Water Intake Target Calculation

`src/lib/waterTargetCalculator.js`

```js
export function getWaterTarget(bbKg) {
  if (bbKg == null || bbKg <= 0) return null
  return Math.round(bbKg * 30)
}
```

| # | Criterion |
|---|-----------|
| 1 | Formula: BB (kg) × 30 ml (WHO) |
| 2 | BB sourced from `profiles.berat_badan` (always current via Part A trigger) |
| 3 | Null/zero/negative BB → returns null → empty state in UI |
| 4 | Pure function, no DB calls |

---

### #18 — Water Intake Entry (Diary & Dashboard)

Supports backdating — separate `tanggal` (intake date) from `created_at` (record timestamp), mirroring `food_logs`.

| # | Criterion |
|---|-----------|
| 1 | **Food Diary page:** numeric ml input + date selector (defaults today) + "Tambah" button, below calorie target section |
| 2 | Date selector allows past dates, no future dates |
| 3 | Each entry: `user_id`, `tanggal`, `volume_ml` (> 0, ≤ 10000), `created_at` (auto) |
| 4 | Entry list below input: entries for selected date, with timestamp + volume + delete button |
| 5 | Empty state: "Belum ada catatan asupan air untuk tanggal ini" |
| 6 | Multiple entries per date allowed |

**Hooks:** `src/hooks/useWaterIntake.js`

```js
useWaterIntakeByDate(userId, tanggal)  // query entries for a date
useAddWaterIntake()                     // mutation: insert {user_id, tanggal, volume_ml}
useDeleteWaterIntake()                  // mutation: audit insert → hard delete
```

---

### #20 — Delete Water Intake Entry

Matches `food_logs` / `exercise_logs` pattern: **audit-before-delete, hard delete**.

| # | Criterion |
|---|-----------|
| 1 | Delete button (Trash2) on each entry row |
| 2 | Confirmation dialog: volume + timestamp + "Tindakan ini tidak bisa dibatalkan." |
| 3 | On confirm: insert `water_intake_deletions` → delete from `water_intakes` |
| 4 | If audit insert fails, delete never runs (fail-safe) |
| 5 | RLS: only owner can delete; staff can only read both tables |
| 6 | Audit table is append-only (insert for klien, select for staff) |

---

### #19 — Water Intake Progress Bar (Dashboard)

| # | Criterion |
|---|-----------|
| 1 | Progress bar on klien dashboard, below calorie summary |
| 2 | Queries today's entries only: `tanggal = current_date`. Backdated entries don't affect today's bar |
| 3 | Display: `800 ml / 2.100 ml`. Bar fill = consumed / target × 100 (capped at 100%) |
| 4 | Reached/exceeded: bar full, label "Tercapai" |
| 5 | **Tap → dialog** (not navigation): compact today's entries list, numeric input, date selector (defaults today, can backdate), "Tambah" button. Close on save/dismiss |
| 6 | No BB → hidden, empty state: "Lengkapi data berat badan melalui ahli gizi untuk melihat target asupan air." |

---

### Component Tree

```
src/components/water/
├── WaterIntakeInput.jsx          (ml input + date selector + Tambah button)
├── WaterIntakeList.jsx           (entries for selected date + delete)
├── WaterProgressBar.jsx          (dashboard bar, 3 states: loading/empty/active)
└── WaterIntakeDialog.jsx         (quick-entry dialog for dashboard tap)

src/hooks/
└── useWaterIntake.js             (queries + mutations)

src/lib/
└── waterTargetCalculator.js      (pure target formula)
```

### All Files

| Action | File |
|--------|------|
| New | `supabase/migrations/20260624_sync_profile_bb_from_assessment.sql` |
| New | `supabase/migrations/20260624_water_intakes.sql` |
| Update | `supabase/schema.sql` |
| New | `src/lib/waterTargetCalculator.js` |
| New | `src/lib/waterTargetCalculator.test.js` |
| New | `src/hooks/useWaterIntake.js` |
| New | `src/hooks/useWaterIntake.test.js` |
| New | `src/components/water/WaterIntakeInput.jsx` |
| New | `src/components/water/WaterIntakeList.jsx` |
| New | `src/components/water/WaterProgressBar.jsx` |
| New | `src/components/water/WaterProgressBar.test.jsx` |
| New | `src/components/water/WaterIntakeDialog.jsx` |
| Modify | `src/pages/klien/FoodEntry.jsx` |
| Modify | `src/pages/klien/Dashboard.jsx` |

### Implementation Order

```
1. Part A migration    (BB sync trigger + backfill)
2. #17                 (target calculator + tests)
3. water_intakes migration (tables + RLS)
4. #18 + #20           (useWaterIntake hook + WaterIntakeInput/List/Dialog + tests)
5. #19                 (WaterProgressBar + Dashboard integration + tests)
6. npm run lint && npm test
```

### Out of Scope

- Staff dashboard water intake visibility
- Assessment page water intake integration
- Exercise logs affect on water target
