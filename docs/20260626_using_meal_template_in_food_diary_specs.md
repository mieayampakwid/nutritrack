# Feature Spec — Template Browsing on Diary Page

- **Date:** 2026-06-26
- **Status:** Draft — pending review
- **Branch:** `feat/meal-template` (follows up on save & reuse)
- **Roles affected:** `klien` only.
- **Depends on:** Save & Reuse Meal Templates (`docs/20260623_meal_templates.md`)

---

## 1. Overview

Saved templates are currently accessible only via a dialog triggered by a "Gunakan template" ghost button inside the food entry form. This feature replaces the dialog with an **inline "Template Saya" section** on the diary page, showing template cards that can be tapped to pre-fill a meal entry. The section is always visible (no dialog, no button to open it), making templates a first-class part of the food entry flow.

## 2. Goals & Non-Goals

**Goals**

- Display saved templates as cards directly on the food entry page (not hidden in a dialog).
- Show each card with: template name, item count, and total calories.
- Tapping a card adds all its items to the current draft entry (same append behavior as US-2).
- Show an empty state when the user has no saved templates.

**Non-Goals (this iteration)**

- Filtering or searching templates (total count is expected to be small).
- Editing templates after saving (delete only).
- Drag-and-drop template reordering.

## 3. User Stories

- **US-4 (Browse):** As a `klien` on the diary page, I can see my saved templates displayed as cards in a "Template Saya" section, each showing the template name, item count, and total calories.
- **US-5 (Tap to Apply):** As a `klien`, tapping a template card adds all its items to my current food entry draft. I can then add, remove, or edit items before submitting.
- **US-6 (Empty State):** As a `klien` with no saved templates, I see an empty state message in the "Template Saya" section explaining that templates can be saved from the confirmation screen.

## 4. Data Model

No changes — reuses existing `meal_templates` + `meal_template_items` tables and `useMealTemplates` hook.

## 5. UI — Template Section

**Component:** Rewrite `src/components/food/MealTemplatePicker.jsx` from Dialog-based to inline section.

**Where:** Inside `src/components/food/FoodEntryForm.jsx`, rendered **below the "Tambah makanan" button**. Section is always visible (no toggle, no dialog trigger).

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Template Saya                          [Trash2] │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Sarapan 1│  │ Siang 2  │  │ Snack 3  │  →  │
│  │ 3 item   │  │ 2 item   │  │ 1 item   │     │
│  │ 570 kkal │  │ 340 kkal │  │ 150 kkal │     │
│  │ [🗑️]     │  │ [🗑️]     │  │ [🗑️]     │     │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

- **Section header:** "Template Saya" as a small bold label, left-aligned.
- **Cards:** Horizontal scrollable row (`overflow-x-auto`, `flex-nowrap`, `gap-3`). Each card is `min-w-[140px]` with `rounded-xl border p-3 hover:bg-muted/50 cursor-pointer transition-colors`.
- **Card content:**
  - Template name (`font-medium text-sm`)
  - Item count + total calories (`text-xs text-muted-foreground`): `"3 item · 570 kkal"`
  - Delete button (Trash2 icon, `h-3.5 w-3.5`, `text-muted-foreground hover:text-destructive`) — positioned top-right, `aria-label="Hapus template"`. Clicking delete must **stop propagation** so it doesn't trigger the card's onApply.
- **Empty state:** When `templates.length === 0`, render muted text below the section header: *"Belum ada template tersimpan. Simpan kombinasi makanan favorit dari halaman konfirmasi."*

**Props (simplified from Dialog version):**

| Prop | Type | Notes |
|---|---|---|
| `templates` | `Array<Template>` | From `useMealTemplates(userId)` |
| `onApply` | `(template: Template) => void` | Card tap handler |
| `onDelete` | `(id: string) => void` | Delete button handler |

**Removed props:** `open`, `onOpenChange` (no longer a dialog).

**Card tap behavior:** Same as existing `handleApplyTemplate` — maps `meal_template_items` to input rows, appends to existing rows, sets meal time from `template.waktu_makan`, and expands the first applied row. User can then add, remove, or edit rows before clicking **Analisa**.

## 6. UI — FoodEntryForm Integration

**Changes to `src/components/food/FoodEntryForm.jsx`:**

- Remove `templatePickerOpen` state (no dialog to open/close).
- Remove the "Gunakan template" ghost button (replaced by the inline section).
- Render `<MealTemplatePicker>` inline, below "Tambah makanan" button area, **without** `open`/`onOpenChange` props.
- Keep `handleApplyTemplate` and `handleDeleteTemplate` unchanged.

## 7. Edge Cases & Behaviors

| Case | Behavior |
|---|---|
| No saved templates | Empty state message shown; no cards rendered. |
| Card tap with existing typed rows | Template items **appended** to existing rows. User keeps what they typed. |
| Card tap when no meal type selected | Meal time is set from `template.waktu_makan` if present. If null, user must still select. |
| Delete button tap | Only `onDelete(id)` fires; card's `onApply` does NOT fire (event propagation stopped). |
| Applying then deleting rows | User is free to remove applied items before Analisa. No restriction. |

## 8. Testing

| Target | What to verify |
|---|---|
| `src/components/food/MealTemplatePicker.test.jsx` | Renders section header "Template Saya"; renders cards with name, count, calories; empty state message; card tap calls `onApply`; delete button calls `onDelete` without `onApply`. |
| `src/components/food/FoodEntryForm.test.jsx` (extend) | "Template Saya" section not rendered when `templates` is empty; section renders with cards when templates exist. |

Pre-commit gates: `npm run lint` and `npm test` both green.

## 9. Acceptance Criteria Mapping

| AC | Coverage |
|---|---|
| "Template Saya" section accessible from food entry page | §5 — inline section below "Tambah makanan" |
| Template card: name, item count, total calories | §5 — card layout |
| Tapping adds items to draft, same multi-item flow | §5, §7 — same `handleApplyTemplate` append behavior |
| User can remove/add items after applying | §7 — no restriction on row editing |
| Empty state with explanation | §5 — muted text when `templates.length === 0` |

---
