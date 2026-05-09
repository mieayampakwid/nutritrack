# Date Range Filter for ParticipantDetail

**Date:** 2026-05-09
**Status:** Approved

## Overview

Add a date range filter to `ParticipantDetail.jsx` (ahli gizi view) that controls the measurement data shown in the Progress Timeline and the food/exercise logs in SectionAccordion. The Vital Metric Cards are explicitly excluded — they always show the latest measurement regardless of date range.

## Scope

| Area | Filtered by date range? |
|------|------------------------|
| Vital Metric Cards (Berat, BMI, etc.) | No — always latest |
| Progress Timeline | Yes |
| Section Accordion (Food/Exercise logs) | Yes |

## Decisions

- **Server-side filtering** — `useMeasurements` hook accepts `dateFrom`/`dateTo` params, sent as `.gte()`/`.lte()` on Supabase query (following `useFoodLogsForUser` pattern).
- **Default range** — last 14 days on initial load.
- **UI component** — two separate `DatePicker` instances (Dari/Sampai), not a range calendar. Follows existing pattern in `ClientQuickSummaryModal`.
- **No reset button** — user adjusts dates manually.
- **Backward compatible** — existing callers of `useMeasurements` without options object continue to work (returns all data).
- **Timezone-safe** — uses `toIsoDateLocal()` for local date strings. DB `tanggal` columns are `date` type (no time component). No UTC shift can occur.

## Files Changed

### New: `src/components/shared/DateRangeFilter.jsx`

Reusable component wrapping two `DatePicker` instances.

- **Props:** `dateFrom`, `dateTo`, `onChange({ dateFrom, dateTo })`
- **Layout:** Side-by-side on desktop, stacked on mobile
- **Validation:** Auto-swap if `dateFrom > dateTo` (using `compareIsoDates` from `foodLogRange.js`)

### Modified: `src/hooks/useMeasurement.js`

Add optional `options` parameter with `dateFrom`/`dateTo`:

```js
export function useMeasurements(userId, options = {}) {
  const { enabled = true, dateFrom, dateTo } = options
  // queryKey includes dateFrom/dateTo for cache invalidation
  // Server-side filter: .gte('tanggal', dateFrom), .lte('tanggal', dateTo)
}
```

### Modified: `src/pages/ahli-gizi/ParticipantDetail.jsx`

- Add `dateFrom`/`dateTo` state (default: last 14 days via `subDays(..., 13)` to `toIsoDateLocal(today)`)
- Render `<DateRangeFilter>` between Vital Metrics grid and Progress Timeline
- Pass `dateFrom`/`dateTo` to `useMeasurements`
- Pass `dateFrom`/`dateTo` to `SectionAccordion`

### Modified: `src/components/participants/SectionAccordion.jsx`

- Accept `dateFrom`/`dateTo` props
- Keep existing `tanggal` prop for backward compatibility
- Effective range resolution: if both `dateFrom`/`dateTo` and `tanggal` are provided, `tanggal` takes priority (single-day range). If only `dateFrom`/`dateTo` provided, use those. If none, default to last 14 days (existing behavior).
- Pass effective range to `useExerciseLogsForUser` and `ActivityLogTable`

### Modified: `src/components/shared/ActivityLogTable.jsx`

- Accept `dateFrom`/`dateTo` props in addition to existing `tanggal` prop
- Client-side date range filtering: if `dateFrom`/`dateTo` provided, filter with `>= dateFrom && <= dateTo`. If only `tanggal` provided, exact match (existing behavior). If none, default to last 14 days (existing behavior).

## Component Interactions

```
ParticipantDetail
├── DateRangeFilter          ← dateFrom/dateTo onChange
├── VitalMetricCards         ← NO filtering (uses lastMeasurement unchanged)
├── ProgressTimeline         ← receives filtered measurements via useMeasurements(id, { dateFrom, dateTo })
└── SectionAccordion         ← receives dateFrom/dateTo
    ├── useExerciseLogsForUser(id, { dateFrom, dateTo })
    └── ActivityLogTable     ← receives dateFrom/dateTo for client-side food log filtering
```

## Testing

- `DateRangeFilter` — renders two DatePickers, calls onChange with correct values
- `useMeasurements` with date range — adds `.gte()`/`.lte()` to query when dates provided
- `ParticipantDetail` — renders DateRangeFilter in correct position, passes dates to children
- `SectionAccordion` — passes date range to exercise logs hook
