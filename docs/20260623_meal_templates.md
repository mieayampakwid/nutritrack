# Feature Spec — Save & Reuse Meal Templates

- **Date:** 2026-06-23
- **Status:** Implemented
- **Branch:** `feat/meal-template`
- **Roles affected:** `klien` only.

---

## 1. Overview

Composing a food log is a one-shot action today: a `klien` types each food row, runs AI calorie analysis, reviews the confirmation card, and saves. There is no way to remember a frequently-eaten combination of foods, so a user who eats the same meal regularly re-types the same items each time.

This feature introduces a personal **meal template**: a saved combination of food items that can be:

1. **Saved** directly from the food-log confirmation card (the review screen shown before "Simpan").
2. **Reused** to pre-fill the food rows when starting a new meal — with stored macros, skipping AI analysis when meal time is already selected.

There is currently no template / favorit / preset concept anywhere in the database or frontend. This feature is greenfield and deliberately mirrors the existing `food_logs` / `food_log_items` structure and conventions.

## 2. Goals & Non-Goals

**Goals**

- Let a `klien` save the meal they just composed as a template, in the same action as saving the log.
- Let a `klien` apply a saved template to quickly pre-fill a new meal's food rows.
- When meal time is already selected, applying a template skips AI analysis and goes directly to the confirmation card using stored macros.

**Non-Goals (this iteration)**

- Rename a saved template (delete is included; rename is not).
- Filtering or searching templates.
- Editing a template's portions after it is saved.
- Staff-authored or shared/group templates.

## 3. User Stories

- **US-1 (Save):** As a `klien`, after analyzing a meal, I can check "Simpan kombinasi ini sebagai template" on the confirmation card, and pressing **Simpan** saves both my food log *and* the meal as a reusable template (auto-named "Template N").
- **US-2 (Reuse):** As a `klien` starting a new meal, I can tap a saved template card to pre-fill food rows. If meal time is selected, the confirmation card appears immediately with stored macros — no re-analysis needed.
- **US-3 (Isolation):** One `klien` cannot see or use another `klien`'s templates.

## 4. Data Model

Two new tables, mirroring `food_logs` / `food_log_items`.

### `meal_templates` (parent)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK → `profiles(id)` | owner; `on delete cascade`; `not null` |
| `nama` | text | auto-generated ("Template 1", "Template 2", …); `not null` |
| `created_at` | timestamptz | default `now()` |

### `meal_template_items` (child)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `meal_template_id` | uuid FK → `meal_templates(id)` | `on delete cascade` |
| `nama_makanan` | text | `not null` |
| `jumlah` | numeric(6,2) | `not null` |
| `unit_id` | uuid FK → `food_units(id)` | nullable |
| `unit_nama` | text | denormalized unit name; `not null` (survives `food_units` deletion) |
| `kalori_estimasi` | numeric(8,2) | `default 0` |
| `karbohidrat` | numeric(8,2) | `default 0` |
| `protein` | numeric(8,2) | `default 0` |
| `lemak` | numeric(8,2) | `default 0` |
| `serat` | numeric(8,2) | `default 0` |
| `natrium` | numeric(8,2) | `default 0` |
| `created_at` | timestamptz | default `now()` |

### Indexes

- `meal_templates`: `(user_id, created_at desc)` — matches the query pattern (fetch by owner, newest first).
- `meal_template_items`: `(meal_template_id)` — FK join performance for nested select.

### RLS

Both tables have RLS enabled. Owner-only access scoped to `user_id`.

- `meal_templates`: `FOR ALL` using (`auth.uid() = user_id`).
- `meal_template_items`: `FOR ALL` using (`public.meal_template_owned_by_me(meal_template_id)`) **with check** (`public.meal_template_owned_by_me(meal_template_id)`).
- Staff read policy on both tables via `public.jwt_is_staff()`.

### SECURITY DEFINER helper

`meal_template_owned_by_me(p_template_id uuid)` — checks `mt.user_id = (select auth.uid())`. Grants restricted to `authenticated` only (revoked from `public`).

### Migration

- `supabase/migrations/20260625_meal_templates.sql`.
- Mirrored in `supabase/schema.sql`.

## 5. Data Access (Hooks)

`src/hooks/useMealTemplates.js`:

- **`useMealTemplates(userId)`** — query. Nested select: `select('*, meal_template_items(*)')`.
- **`useCreateMealTemplate()`** — mutation. Inserts parent, then children with returned ID. Invalidates `['meal_templates', userId]`.
- **`useDeleteMealTemplate()`** — mutation. Deletes parent (items cascade). Toast: `"Template berhasil dihapus."`

## 6. UI — Save Flow

**Where:** confirmation card in `FoodEntryForm.jsx`.

- Native checkbox: **"Simpan kombinasi ini sebagai template"** (no name input — auto-named).
- Layout: checkbox on the left, Batal/Simpan buttons on the right (`sm:flex-row sm:justify-between`).
- After food log save, if checked, creates template (best-effort): on failure, log stays saved, warning toast shown.

## 7. UI — Reuse Flow (Inline Template Browsing)

**Component:** `src/components/food/MealTemplatePicker.jsx` — inline section (not a dialog).

**Where:** Below "Tambah makanan" button in `FoodEntryForm.jsx`. Always visible.

**Layout:** Card container (`rounded-xl border bg-card p-4`) with:
- Header: Cookie icon + "Template Saya"
- Horizontal scrollable card row (`gap-3.5`, `min-w-[160px]` per card)
- Each card: template name, item count + total calories, delete button (visible at 40% opacity on touch, full on hover)
- Skeleton loading state (3 pulsing placeholder cards)
- Empty state: muted text explaining how to save templates

**Apply behavior:**

| State | Behavior |
|---|---|
| Meal time selected + jam makan set | Replaces default empty row with template items. Builds `pendingResult` from stored macros — **skips AI analysis**. Confirmation card appears with Simpan. |
| No meal time selected | Replaces default empty row with template items. User picks meal time, clicks Analisa. |
| Existing typed rows | Appends template items to existing rows. |

Toast on apply: `Template "Nama" diterapkan`.

## 8. Edge Cases & Behaviors

| Case | Behavior |
|---|---|
| Checkbox checked but template insert fails | Log stays saved; warning toast shown. |
| A `food_units` row is later deleted | Template displays correctly via denormalized `unit_nama`. |
| Applying a template with existing typed rows | **Appends** template items to existing rows. |
| Applying a template (default empty row only) | **Replaces** the empty row with template items. |
| Cross-user access | Blocked by RLS. |

## 9. Testing

| Target | What to verify |
|---|---|
| `src/hooks/useMealTemplates.test.js` | Query returns embedded items; create mutation inserts parent + children. |
| `src/components/food/MealTemplatePicker.test.jsx` | Empty state, skeleton loading, cards with name/count/calories, onApply, onDelete without onApply, delete button visible on touch. |
| `src/components/food/FoodEntryForm.test.jsx` | Template checkbox, save with template, best-effort failure, template section visibility, apply toast, skip-analysis when meal time selected. |

## 10. Resolved Decisions

| Question | Decision |
|---|---|
| Template naming | **Auto-generated.** "Template N" based on existing count. No user input. |
| `waktu_makan` on templates | **Removed.** Not in AC. Templates are meal-time-agnostic. |
| Apply — replace vs. append | **Replace** default empty row; **append** if user has typed rows. |
| Skip analysis on apply | **Yes.** When meal time is set, stored macros build `pendingResult` directly. |
| Delete in v1 | **Included.** Trash icon with hover-reveal (40% opacity on touch). |

## 11. Out of Scope / Follow-ups

- Rename templates.
- Filtering or searching templates.
- Editing a template's portions after saving.
- Group/shared templates authored by `ahli_gizi`.

---
