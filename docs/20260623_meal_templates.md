# Feature Spec — Save & Reuse Meal Templates

- **Date:** 2026-06-23
- **Status:** Draft — pending review
- **Branch:** `feat/meal-template`
- **Roles affected:** `klien` (primary). Staff (`admin`, `ahli_gizi`) are read-only.

---

## 1. Overview

Composing a food log is a one-shot action today: a `klien` types each food row, runs AI calorie analysis, reviews the confirmation card, and saves. There is no way to remember a frequently-eaten combination of foods, so a user who eats the same meal regularly re-types the same items each time.

This feature introduces a personal **meal template**: a saved combination of food items that can be:

1. **Saved** directly from the food-log confirmation card (the review screen shown before "Simpan").
2. **Reused** to pre-fill the food rows when starting a new meal.

There is currently no template / favorit / preset concept anywhere in the database or frontend. This feature is greenfield and deliberately mirrors the existing `food_logs` / `food_log_items` structure and conventions.

## 2. Goals & Non-Goals

**Goals**

- Let a `klien` save the meal they just composed as a named template, in the same action as saving the log.
- Let a `klien` apply a saved template to quickly pre-fill a new meal's food rows.
- Keep every saved log flowing through the existing AI analysis path (no bypass of calorie estimation).

**Non-Goals (this iteration)**

- Rename a saved template (delete is included; rename is not).
- Showing per-template calorie totals in the picker.
- Editing a template's portions after it is saved (the user edits the rows after applying, which already works).
- Staff-authored or shared/group templates.

## 3. User Stories

- **US-1 (Save):** As a `klien`, after analyzing a meal, I can check "Simpan juga sebagai template" on the confirmation card, optionally name it, and pressing **Simpan** saves both my food log *and* the meal as a reusable template.
- **US-2 (Reuse):** As a `klien` starting a new meal, I can open my saved templates, pick one, and have its food rows (and meal time) pre-filled — then continue to analyze and save as usual.
- **US-3 (Isolation):** One `klien` cannot see or use another `klien`'s templates.

## 4. Data Model

Two new tables, mirroring `food_logs` / `food_log_items`.

### `meal_templates` (parent)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK → `profiles(id)` | owner; `on delete cascade` |
| `nama` | text | user-facing template name; `not null` |
| `waktu_makan` | text | `'pagi' \| 'siang' \| 'malam' \| 'snack'` (nullable) — the meal it was saved from |
| `created_at` | timestamptz | default `now()` |

### `meal_template_items` (child)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `template_id` | uuid FK → `meal_templates(id)` | `on delete cascade` |
| `nama_makanan` | text | `not null` |
| `jumlah` | numeric(6,2) | `not null` |
| `unit_id` | uuid FK → `food_units(id)` | nullable |
| `unit_nama` | text | denormalized unit name; `not null` (survives `food_units` deletion, same pattern as `food_log_items`) |
| `created_at` | timestamptz | default `now()` |

**Design note — no macros stored.** Template items intentionally store only food identity + quantity, **not** calories/macros. When a template is applied, the items populate the input rows and the user runs **Analisa** as usual, so every saved log still derives its calorie estimate from the `estimate-calories` Edge Function (consistent with the project rule that estimates are immutable and come only from the Edge Function). This also avoids stale macro values drifting in stored templates.

### RLS

Mirrors the `food_logs` pattern: owner gets full access scoped to `user_id`; staff get read-only.

- `meal_templates`: klien `FOR ALL` (`auth.uid() = user_id`); staff `FOR SELECT` (`jwt_is_staff()`).
- `meal_template_items`: ownership resolved through the parent via a new `SECURITY DEFINER` helper `meal_template_owned_by_me(template_id)` — same approach as the existing `food_log_owned_by_me(food_log_id)`.

Explicit grants on the new tables + `execute` on the helper for `authenticated`.

### Migration

- New file `supabase/migration_meal_templates.sql`.
- Mirror the same DDL into the canonical `supabase/schema.sql`.
- Apply to the remote project via the Supabase `apply_migration` tool; verify with `list_tables` and `get_advisors` (security).
- Add the two tables to the DB table list in `AGENTS.md` §7.

## 5. Data Access (Hooks)

New file `src/hooks/useMealTemplates.js`, following `src/hooks/useFoodLog.js` conventions.

- **`useMealTemplates(userId)`** — query. Key `['meal_templates', userId]`. Uses a nested select to fetch templates with their items in one round-trip:
  `supabase.from('meal_templates').select('*, meal_template_items(*)').eq('user_id', userId).order('created_at', { ascending: false })`.
- **`useCreateMealTemplate()`** — `useMutation`. Inserts the parent row (`.select().single()`), then the child items with `template_id`. Invalidates `['meal_templates', userId]`. No success toast (the save is announced by the existing "Tersimpan" flow + the log save); the component handles the best-effort error case.
- **`useDeleteMealTemplate()`** — `useMutation`. Deletes the parent row (items cascade via `on delete cascade`). Invalidates `['meal_templates', userId]`. Toast: `"Template berhasil dihapus."`

## 6. UI — Save Flow

**Where:** the confirmation card in `src/components/food/FoodEntryForm.jsx` (the pre-save review screen that shows analyzed items and the **Batal** / **Simpan** buttons).

**Behavior:**

- Add local state `saveAsTemplate` (bool, default `false`) and `templateName` (string).
- In the `isPending` action area, render a labeled native checkbox **"Simpan juga sebagai template"**. When checked, reveal a text `Input` for the name. The name defaults to a suggestion based on the first item (e.g. *"Nasi goreng (+2)"*); if left blank, the suggestion is used.
- In `handleConfirmSave`, **after the food log + items are successfully saved**, if `saveAsTemplate` is checked, create the template (best-effort):
  - Map the just-saved items to `{ nama_makanan, jumlah, unit_id, unit_nama }` (drop macros).
  - Call `useCreateMealTemplate` with `{ userId, nama, waktu_makan, items }`.
  - Wrap in its own `try/catch`. **On failure, the saved log is kept** and a warning toast is shown: *"Log tersimpan, tapi gagal menyimpan template."* The log save is never rolled back because of a template error.
- Reset `saveAsTemplate` / `templateName` whenever `pendingResult` is cleared (success and discard).

**Why a native checkbox:** there is no `checkbox.jsx` primitive in `src/components/ui/`, and we avoid adding `@radix-ui/react-checkbox` to keep dependencies unchanged. A native `<input type="checkbox">` inside a styled `<label>` is accessible and matches the card's styling via `cn()`.

## 7. UI — Reuse Flow

**New component:** `src/components/food/MealTemplatePicker.jsx`, built on the existing `src/components/ui/dialog.jsx`.

- Props: `{ open, onOpenChange, templates, onApply, onDelete }`.
- Lists each template: name, item count (*"3 item"*), and a one-line preview of the item names.
- Empty state: *"Belum ada template tersimpan."*
- Selecting a template calls `onApply(template)` and closes the dialog.
- Each template row includes a small delete button (trash icon) that calls `onDelete(template.id)`.

**Where (entry point):** the input state of `FoodEntryForm.jsx` (the screen with the meal-time selector and food rows), near the **"Tambah makanan"** button.

- A ghost **"Gunakan template"** button, shown only when the user has at least one template (from `useMealTemplates(userId)`).
- On apply: map each `meal_template_items` row to an input row `{ id, nama, jumlah, unitId }` (reuse the existing row shape), call `setRows(...)`, expand the first row, and set the meal selector from `template.waktu_makan` when present.
- The user then sets the time and presses **Analisa** as usual — the template only saves typing.

## 8. Edge Cases & Behaviors

| Case | Behavior |
|---|---|
| Checkbox checked but template insert fails | Log stays saved; warning toast shown. |
| Template name left blank | Falls back to the auto-suggested name (first item + count). |
| A `food_units` row is later deleted | Template still displays correctly via denormalized `unit_nama`; `unit_id` becomes dangling but harmless (the Select falls back to the unit list). |
| Applying a template with existing typed rows | **Appends** template items to existing rows. User keeps what they typed. |
| Cross-user access | Blocked by RLS (`user_id` scoping). |
| Staff viewing a client | Staff can read templates (`FOR SELECT`) for monitoring, but cannot create them (the save UI only exists in the `klien` flow). |

## 9. Testing

| Target | What to verify |
|---|---|
| `src/hooks/useMealTemplates.test.js` | Query returns embedded items; create mutation inserts parent + children and invalidates `['meal_templates', userId]`. Uses `queryWrapper` + `supabaseMock`. |
| `src/components/food/MealTemplatePicker.test.jsx` | Renders templates, empty state, selecting calls `onApply` with the correct template. |
| `src/components/food/FoodEntryForm.test.jsx` (extend) | Checkbox toggles the name field; when checked, a successful Simpan also creates a template; template-create failure leaves the log saved and warns; picking a template pre-fills the rows. |

Pre-commit gates: `npm run lint` and `npm test` both green.

## 10. Resolved Decisions

| Question | Decision |
|---|---|
| Apply behavior — replace vs. append | **Append.** Template items are added to existing rows. User always keeps what they typed. |
| Default template name | **Auto-suggest + editable.** Pre-fill with first item name + count (e.g. "Nasi goreng (+2)"); user can edit or accept. |
| Delete in v1 | **Include.** Small delete button (trash icon) on each template row in the picker. Requires `useDeleteMealTemplate` hook + mutation. |

## 11. Out of Scope / Follow-ups

- **Delete / rename templates** — delete ships in v1; rename is a follow-up.
- **Template calorie totals** in the picker (would require storing macros).
- **Append vs. replace** refinement when applying a template over existing rows.
- Group/shared templates authored by `ahli_gizi`.

---

*Based on the implementation plan at `~/.claude/plans/snug-tumbling-lobster.md`.*
