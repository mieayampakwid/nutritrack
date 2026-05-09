# Anjuran Kalori Harian — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual adjusted calorie input to the Harris-Benedict assessment form, persist it separately from the original calculated value, and use it as the calorie ceiling in the dashboard chart and WhatsApp summary.

**Architecture:** New `anjuran_kalori_harian` nullable column on `assessments`. AssessmentForm gains a pre-filled numeric input. Three consumers (DailyCalorieChart, ClientQuickSummaryModal, ClientNutritionSummaryCard) use `anjuran_kalori_harian ?? energi_total` as the effective calorie target. Backward compatible — existing rows with NULL column behave identically to before.

**Tech Stack:** React 19, Supabase (Postgres), TanStack Query, Vitest + testing-library

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_anjuran_kalori.sql`
- Modify: `supabase/schema.sql` (line ~92, `assessments` table definition)

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/YYYYMMDDHHMMSS_add_anjuran_kalori.sql` (replace `YYYYMMDDHHMMSS` with current timestamp):

```sql
ALTER TABLE public.assessments
  ADD COLUMN anjuran_kalori_harian numeric(10,2);

COMMENT ON COLUMN public.assessments.anjuran_kalori_harian
  IS 'Manual adjusted daily calorie recommendation set by ahli gizi. Falls back to energi_total when NULL.';
```

- [ ] **Step 2: Update canonical schema**

In `supabase/schema.sql`, find the `assessments` table definition (around line 84-92). Add after the last column (before `created_by`):

```sql
  created_at timestamptz not null default now(),
  anjuran_kalori_harian numeric(10,2)     -- <--- ADD THIS LINE
);
```

The exact location is after `created_at` and before the closing `);`. Add:

```sql
  anjuran_kalori_harian numeric(10,2),
```

- [ ] **Step 3: Apply migration to Supabase**

Run: `supabase db push` or connect to Supabase SQL editor and run the ALTER TABLE manually.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/ supabase/schema.sql
git commit -m "feat: add anjuran_kalori_harian column to assessments"
```

---

### Task 2: Add `anjuran_kalori_harian` input to AssessmentForm

**Files:**
- Modify: `src/components/participants/AssessmentForm.jsx`
- Modify: `src/components/participants/AssessmentForm.test.jsx` (if exists, create regression test)

- [ ] **Step 1: Add state for anjuran_kalori_harian**

In `src/components/participants/AssessmentForm.jsx`, add after the `catatan` state (after line 54):

```jsx
  const [anjuranStr, setAnjuranStr] = useState(() => lastAssessment?.anjuran_kalori_harian != null ? String(lastAssessment.anjuran_kalori_harian) : '')
```

- [ ] **Step 2: Pre-fill anjuran when energi_total is computed and input is empty**

Add after the `totalEnergy` calculation (after line 75) — this `useMemo` or `useEffect` syncs the pre-fill:

Actually, the simpler approach: initialize with `energi_total` fallback at state declaration level. But `energi_total` is computed from form inputs so it changes dynamically. Better approach: when the input is empty and `totalEnergy` exists, use `totalEnergy` as the display value. Keep it simple with a derived display value:

No extra state logic needed — just handle the pre-fill in the input's `placeholder` or `defaultValue`. Since we already set `anjuranStr` from `lastAssessment.anjuran_kalori_harian`, for new assessments it will be empty. We'll use `totalEnergy` as the input placeholder.

**Add `anjuran_kalori_harian` to the save payload** (after line 98, inside `onSave`):

Change lines 96-100:

```jsx
      bmi,
      bmr,
      energi_total: totalEnergy,
      anjuran_kalori_harian: parseFloat(anjuranStr) || totalEnergy || null,
      catatan_asesmen: catatan.trim() || null,
```

- [ ] **Step 3: Add the UI input field**

Insert after the HB results panel (after line 273, before the `</Card>` on line 274):

```jsx
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="anjuran-kalori">Anjuran Kalori Harian</Label>
              <span className="text-xs text-muted-foreground">
                {totalEnergy != null ? `HB: ${formatNumberId(totalEnergy)} kkal` : ''}
              </span>
            </div>
            <Input
              id="anjuran-kalori"
              type="number"
              inputMode="decimal"
              value={anjuranStr}
              onChange={(e) => setAnjuranStr(e.target.value)}
              placeholder={totalEnergy != null ? String(totalEnergy) : 'Masukkan anjuran kalori'}
              className="tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Nilai yang disimpan akan digunakan sebagai batas kalori di dashboard klien. Biarkan sesuai HB atau sesuaikan.
            </p>
          </div>
```

The UI layout after the HB results panel:
```
┌──────────────────────────────────────────┐
│ BMR (perkiraan): 1.450 kkal/hari         │
│ Total Kebutuhan Energi: 2.100 kkal/hari  │
├──────────────────────────────────────────┤
│ Anjuran Kalori Harian        HB: 2100 kkal│
│ [  2100                         ]        │
│ Nilai yang disimpan akan digunakan ...   │
└──────────────────────────────────────────┘
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests PASS. If no existing AssessmentForm tests, verify the form still renders and submits correctly.

- [ ] **Step 5: Commit**

```bash
git add src/components/participants/AssessmentForm.jsx
git commit -m "feat: add anjuran kalori harian input to AssessmentForm"
```

---

### Task 3: Update DailyCalorieChart to use adjusted value

**Files:**
- Modify: `src/components/dashboard/DailyCalorieChart.jsx`
- Create: `src/components/dashboard/DailyCalorieChart.test.jsx` (regression test)

- [ ] **Step 1: Update targetKcal to use adjusted value**

In `src/components/dashboard/DailyCalorieChart.jsx`, change line 119:

```jsx
  const targetKcal = latestAssessment?.anjuran_kalori_harian ?? latestAssessment?.energi_total
```

- [ ] **Step 2: Update chart legend to show correct label**

Change line 86 (in `ChartLegend`) to differentiate the label:

```jsx
          <span className="text-foreground">Garis putus: {label}</span>
```

But `ChartLegend` currently doesn't know whether the value is adjusted. Add a prop:

Change the `ChartLegend` function signature (line 70):

```jsx
function ChartLegend({ hasTarget, isAnjuran }) {
```

Change line 86:

```jsx
          <span className="text-foreground">Garis putus: {isAnjuran ? 'anjuran kalori' : 'target kalori'}</span>
```

Now compute `isAnjuran` in the main component (after line 120):

```jsx
  const isAnjuran = latestAssessment?.anjuran_kalori_harian != null
```

And pass it to ChartLegend. Find where `<ChartLegend` is rendered (line 245):

```jsx
            <ChartLegend hasTarget={hasTarget} isAnjuran={isAnjuran} />
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DailyCalorieChart.jsx
git commit -m "feat: use anjuran kalori harian as chart target with dynamic legend"
```

---

### Task 4: Update ClientQuickSummaryModal WhatsApp message

**Files:**
- Modify: `src/components/clients/ClientQuickSummaryModal.jsx`

- [ ] **Step 1: Update energy variable**

In `src/components/clients/ClientQuickSummaryModal.jsx`, change line 90:

```jsx
  const energy = latestAssessment?.anjuran_kalori_harian ?? latestAssessment?.energi_total
```

No other changes needed — `energy` is already used in the message body at line 176 and the label "Kebutuhan Kalori Harian" stays the same.

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/clients/ClientQuickSummaryModal.jsx
git commit -m "feat: use anjuran kalori harian in WhatsApp evaluation summary"
```

---

### Task 5: Update ClientNutritionSummaryCard

**Files:**
- Modify: `src/components/clients/ClientNutritionSummaryCard.jsx`

- [ ] **Step 1: Display adjusted value as primary, original HB as secondary**

In `src/components/clients/ClientNutritionSummaryCard.jsx`, change lines 107-136 (the kalori display section):

Replace lines 107-136:

```jsx
        <div className="rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Kebutuhan kalori</p>
          {isLoading ? (
            <div className="mt-2 flex justify-center py-2">
              <LoadingSpinner />
            </div>
          ) : latest ? (
            <div className="mt-2 space-y-2">
              <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatNumberId(latest.anjuran_kalori_harian ?? latest.energi_total)}{' '}
                <span className="text-base font-semibold text-muted-foreground">kkal/hari</span>
              </p>
              {latest.anjuran_kalori_harian != null ? (
                <p className="text-xs text-muted-foreground">
                  Anjuran ahli gizi{latest.energi_total != null ? ` (HB: ${formatNumberId(latest.energi_total)} kkal/hari)` : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Berdasarkan Harris–Benedict</p>
              )}
              <dl className="grid gap-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Faktor aktivitas</dt>
                  <dd className="tabular-nums text-foreground">{formatNumberId(latest.faktor_aktivitas)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Faktor stres</dt>
                  <dd className="tabular-nums text-foreground">{formatNumberId(latest.faktor_stres)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Belum ada asesmen tersimpan. Gunakan menu Entri data (BMI &amp; asesmen) untuk menghitung kebutuhan
              energi.
            </p>
          )}
        </div>
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/clients/ClientNutritionSummaryCard.jsx
git commit -m "feat: display anjuran kalori harian in nutrition summary card"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`

- [ ] **Step 2: Run lint**

Run: `npm run lint`

- [ ] **Step 3: Manual verification**

Verify end-to-end:
1. Open assessment form → HB results displayed, anjuran input pre-filled with `energi_total`
2. Change anjuran value, save assessment
3. Open klien dashboard → chart shows dotted line at adjusted value, legend says "anjuran kalori"
4. Open WhatsApp summary → message shows adjusted value
5. NutritionSummaryCard shows "Anjuran ahli gizi (HB: X kkal/hari)"
6. Without adjusted value → all consumers fall back to `energi_total`, legend says "target kalori"
