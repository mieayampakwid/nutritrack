# Participant Assessment Page Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the clinical assessment data entry page with a modern "Clinical Journal" aesthetic, adding evaluation notes functionality while improving UX.

**Architecture:** Single-page form with real-time calculations, two-table save pattern (body_measurements + assessments), clean typography-focused design.

**Tech Stack:** React 19, TanStack Query, Supabase (Postgres), Tailwind CSS 4, existing form components.

---

## Database Migration

Add `catatan` column to assessments table:

```sql
ALTER TABLE public.assessments
ADD COLUMN catatan TEXT;
```

---

## Page Structure

### Route
`/gizi/participants/:id/assessment`

### Layout Components

1. **Navigation Header**
   - Back link to `/gizi/participants/:id`
   - Client name and basic info

2. **Anthropometric Section**
   - Weight (kg) - required
   - Height (cm) - required
   - Muscle mass (kg) - optional
   - Fat mass (%) - optional
   - Waist circumference (cm) - optional
   - Real-time BMI display with category

3. **Clinical Assessment Section**
   - Gender selection (male/female)
   - Age display (from profile) or manual input
   - Activity factor dropdown
   - Stress factor dropdown
   - BMR calculation display
   - Total energy calculation display

4. **Evaluation Notes Section**
   - Textarea for free-form assessment notes
   - Max 5000 characters
   - Character counter

5. **Save Action**
   - Full-width button at bottom
   - Validates required fields
   - Saves to both body_measurements and assessments tables
   - Shows success toast
   - Redirects to participant detail

---

## Form Fields

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| tanggal | date | Yes | Valid date | Today |
| berat_badan | decimal | Yes | 0-300 kg | From last measurement |
| tinggi_badan | decimal | Yes | 0-250 cm | From last measurement |
| massa_otot | decimal | No | 0-200 kg | From last measurement |
| massa_lemak | decimal | No | 0-100% | From last measurement |
| lingkar_pinggang | decimal | No | 0-300 cm | From last measurement |
| jenis_kelamin | enum | Yes | male/female | From profile |
| faktor_aktivitas | select | Yes | Valid value | 1.25 (Normal) |
| faktor_stres | select | Yes | Valid value | 1.25 (No stress) |
| catatan | text | No | Max 5000 chars | Empty |

---

## Component Architecture

### New Files

**`src/pages/ahli-gizi/ParticipantAssessment.jsx`**
- Main page component
- Loads client profile and last measurement
- Manages form state
- Handles save mutations
- Redirects on success

**`src/components/participants/AssessmentForm.jsx`**
- Reusable form component
- Section layouts
- Input field components
- Real-time calculation displays
- Validation logic

### Modified Files

**`src/App.jsx`**
- Add lazy import for ParticipantAssessment
- Add route `/gizi/participants/:id/assessment`

**`supabase/migration_*_assessment_notes.sql`**
- Add catatan column to assessments table

---

## Data Flow

### Load Phase
1. Query `profiles` for client data
2. Query `body_measurements` ordered by tanggal desc, limit 1
3. Pre-populate form with last measurement values
4. Display derived age from tgl_lahir

### Calculation Phase
- **BMI**: `weight (kg) / height (m)²`
- **BMI Category**: WHO Asia-Pacific thresholds
- **BMR**: Harris-Benedict formula
  - Male: `66 + 13.7×weight + 5×height - 6.8×age`
  - Female: `655 + 9.6×weight + 1.8×height - 4.7×age`
- **Total Energy**: `BMR × activity_factor × stress_factor`

### Save Phase
1. Validate required fields (weight, height, gender, factors)
2. Begin transaction-like sequence:
   - Insert to `body_measurements` (tanggal, berat_badan, tinggi_badan, massa_otot, massa_lemak, lingkar_pinggang)
   - Insert to `assessments` (user_id, faktor_aktivitas, faktor_stres, energi_total, catatan, created_by)
3. On success: invalidate queries, show toast, redirect
4. On error: show error toast, stay on page

---

## Validation Rules

```javascript
const assessmentSchema = {
  berat_badan: { min: 0, max: 300, required: true },
  tinggi_badan: { min: 0, max: 250, required: true },
  massa_otot: { min: 0, max: 200, required: false },
  massa_lemak: { min: 0, max: 100, required: false },
  lingkar_pinggang: { min: 0, max: 300, required: false },
  catatan: { maxLength: 5000, required: false }
}
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid weight/height | Inline error message, disable save |
| Network error on save | Toast error, retry allowed |
| Client not found | Redirect to my-group with message |
| Missing profile data | Show manual age input |
| Partial save failure | Rollback, show specific error |

---

## Aesthetic Specifications

### Typography
- Headers: `font-semibold text-lg` (matching ParticipantDetail)
- Labels: `text-sm font-medium text-foreground`
- Values: `tabular-nums` for numbers
- Notes: `text-sm` in textarea

### Colors
- Section backgrounds: `bg-card`
- Borders: `border-border/60`
- Input focus: `ring-primary`
- Calculation cards: `bg-muted/25` with border

### Spacing
- Section gap: `space-y-6`
- Field gap: `space-y-2`
- Input padding: `px-3 py-2`
- Section padding: `p-5`

### Mobile Considerations
- Minimum touch target: 44px
- Single column layout
- Sticky save button at bottom
- Large numeric inputs

---

## Activity & Stress Factors

**Activity Factors:**
- Bed Rest: 1.15
- Normal (not bed rest): 1.25

**Stress Factors:**
- No stress: 1.25
- Mild stress (GI inflammation, cancer, elective surgery, trauma, fever): 1.35
- Moderate stress (Sepsis, bone surgery, burns, liver disease): 1.45
- Severe stress (HIV/AIDS, multi-system surgery, pulmonary TB, complications): 1.55
- Severe stress — head injury: 1.7

---

## Success Criteria

- [ ] Page loads without errors
- [ ] Form pre-populates from last measurement
- [ ] BMI calculates correctly in real-time
- [ ] Energy calculates correctly with all factors
- [ ] Validation prevents invalid saves
- [ ] Save writes to both tables
- [ ] Catatan field saves and retrieves correctly
- [ ] Success toast displays
- [ ] Redirect works after save
- [ ] Mobile layout is functional
- [ ] All tests pass
- [ ] Lint passes

---

## Migration Path

1. Add database migration for catatan column
2. Create new ParticipantAssessment page
3. Add route to App.jsx
4. Update ParticipantDetail "Tambah Data" button to link to new page
5. Test full flow
6. Optionally deprecate old ClientUserDataEntry page

---

## Future Enhancements (Out of Scope)

- Assessment history view
- Export to PDF
- Photo attachment support
- Template/quick-pick notes
- Multi-language support for notes
