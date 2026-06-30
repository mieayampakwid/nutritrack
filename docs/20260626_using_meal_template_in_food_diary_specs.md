# Feature Spec — Template Browsing on Diary Page

- **Date:** 2026-06-26
- **Status:** Implemented
- **Branch:** `feat/meal-template` (follows up on save & reuse)
- **Roles affected:** `klien` only.
- **Depends on:** Save & Reuse Meal Templates (`docs/20260623_meal_templates.md`)

---

## 1. Overview

Saved templates are displayed as an **inline "Template Saya" section** on the food entry page. Template cards show name, item count, and total calories in a horizontal scrollable card row. Tapping a card pre-fills the meal entry — when meal time is already selected, it skips AI analysis and goes directly to the confirmation card using stored macros.

## 2. Goals & Non-Goals

**Goals**

- Display saved templates as cards directly on the food entry page.
- Show each card with: template name, item count, and total calories.
- Tapping a card fills food rows and, if meal time is selected, skips analysis.
- Delete button visible on touch devices.

**Non-Goals (this iteration)**

- Filtering or searching templates.
- Editing templates after saving (delete only).
- Drag-and-drop reordering.

## 3. User Stories

- **US-4 (Browse):** As a `klien` on the diary page, I can see my saved templates displayed as cards in a "Template Saya" section, each showing the template name, item count, and total calories.
- **US-5 (Tap to Apply):** As a `klien`, tapping a template card fills my food entry. If I've already selected a meal time, the confirmation card appears immediately — no need to re-analyze.
- **US-6 (Empty State):** As a `klien` with no saved templates, I see an empty state message in the "Template Saya" section explaining that templates can be saved from the confirmation screen.

## 4. Data Model

No changes — reuses existing `meal_templates` + `meal_template_items` tables and `useMealTemplates` hook.

## 5. UI — Template Section

**Component:** `src/components/food/MealTemplatePicker.jsx` — inline section.

**Where:** Below "Tambah makanan" button in `FoodEntryForm.jsx`. Always visible.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ 🍪 Template Saya                                │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  →  │
│  │ Nasi     │  │ Oatmeal  │  │ Yogurt   │     │
│  │ 3 item   │  │ 1 item   │  │ 3 item   │     │
│  │ 560 kkal │  │ 150 kkal │  │ 279 kkal │     │
│  │     [🗑️]│  │     [🗑️]│  │     [🗑️]│     │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

- **Container:** `rounded-xl border border-border/80 bg-card p-4` — matches food entry row card style.
- **Header:** Cookie icon + "Template Saya" (`text-sm font-semibold`).
- **Cards:** Horizontal scroll (`overflow-x-auto`, `gap-3.5`). Each card: `min-w-[160px] rounded-lg border border-border/40 px-3.5 py-3 hover:bg-muted/50 cursor-pointer`.
- **Card content:**
  - Template name (`text-sm font-medium leading-snug`)
  - Item count + total calories (`text-xs text-muted-foreground`): *"3 item · 570 kkal"*
  - Delete button (Trash2, `h-3.5 w-3.5`) — `absolute right-2 top-2`, visible at `text-muted-foreground/40` on touch, `group-hover:opacity-100` on desktop.
- **Loading state:** 3 skeleton cards with `animate-pulse`.
- **Empty state:** Muted text: *"Belum ada template tersimpan. Simpan kombinasi makanan favorit dari halaman konfirmasi."*

**Props:**

| Prop | Type | Notes |
|---|---|---|
| `templates` | `Array<Template>` | From `useMealTemplates(userId)` |
| `onApply` | `(template: Template) => void` | Card tap handler |
| `onDelete` | `(id: string) => void` | Delete button handler |
| `isLoading` | `boolean` | From `useMealTemplates` — shows skeleton |

## 6. UI — FoodEntryForm Integration

- `MealTemplatePicker` rendered inline below "Tambah makanan" button.
- No dialog trigger or toggle state.

**Apply logic (`handleApplyTemplate`):**

1. Map `meal_template_items` to input rows (`{ id, nama, jumlah, unitId }`).
2. If only the default empty row exists → replace it; otherwise → append.
3. If `mealKey` && `jamMakan` are set:
   - Build `pendingResult` from template macros (kalori_estimasi, karbohidrat, protein, lemak, serat, natrium).
   - Confirmation card appears with Simpan — **AI analysis skipped**.
4. Toast: `Template "Nama" diterapkan`.

## 7. Edge Cases & Behaviors

| Case | Behavior |
|---|---|
| No saved templates | Empty state message shown; no cards rendered. |
| Card tap with existing typed rows | Template items **appended** to existing rows. |
| Card tap when no meal type selected | Rows filled; user must still select meal time and click Analisa. |
| Card tap when meal type selected | Rows filled; confirmation card appears directly — no Analisa needed. |
| Delete button tap | Only `onDelete(id)` fires; card's `onApply` does NOT fire. |
| Applying then deleting rows | User can remove applied items before saving. |

## 8. Testing

| Target | What to verify |
|---|---|
| `MealTemplatePicker.test.jsx` | Empty state, skeleton loading, cards with name/count/calories, onApply, onDelete without onApply, delete button opacity on touch. |
| `FoodEntryForm.test.jsx` | Template section visibility, apply toast, skip-analysis when meal time selected. |

## 9. Acceptance Criteria Mapping

| AC | Coverage |
|---|---|
| "Template Saya" section on food entry page | §5 — inline card section below "Tambah makanan" |
| Template card: name, item count, total calories | §5 — card layout |
| Tapping fills rows, skips analysis when meal time set | §6 — `handleApplyTemplate` with `pendingResult` |
| User can remove/add items after applying | §7 — no restriction on row editing |
| Empty state with explanation | §5 — muted text when no templates |

---
