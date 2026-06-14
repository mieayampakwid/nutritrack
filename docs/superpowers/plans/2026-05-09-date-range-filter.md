# Date Range Filter for ParticipantDetail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a date range filter to ParticipantDetail page that controls measurement data in Progress Timeline and food/exercise logs in SectionAccordion (Vital Metric Cards excluded).

**Architecture:** New `DateRangeFilter` component wraps two `DatePicker` instances. `useMeasurements` hook gains server-side date range filtering following `useFoodLogsForUser` pattern. `ActivityLogTable` and `SectionAccordion` accept `dateFrom`/`dateTo` for range-aware filtering. `ParticipantDetail` wires it all together with 14-day default range.

**Tech Stack:** React 19, react-day-picker v9, date-fns v4, TanStack Query, Supabase, Vitest + testing-library

---

### Task 1: Add date range filtering to `useMeasurements` hook

**Files:**
- Modify: `src/hooks/useMeasurement.js`
- Modify: `src/hooks/useMeasurement.test.js`

- [ ] **Step 1: Write the failing test for date range options**

```js
// Add to the describe block in src/hooks/useMeasurement.test.js after the existing tests:
// (the `vi.mock` and `chain` setup already exists at top of file)

  it('passes dateFrom / dateTo to supabase query when provided', async () => {
    const mockData = [
      { id: '2', user_id: 'u1', tanggal: '2026-05-05', berat_badan: 71 },
    ]
    resultRef.current = { data: mockData, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useMeasurements('u1', { dateFrom: '2026-05-01', dateTo: '2026-05-09' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chain.gte).toHaveBeenCalledWith('tanggal', '2026-05-01')
    expect(chain.lte).toHaveBeenCalledWith('tanggal', '2026-05-09')
    expect(result.current.data).toEqual(mockData)
  })

  it('does not add date filters when dateFrom/dateTo are not provided', async () => {
    const mockData = [{ id: '3', user_id: 'u1', tanggal: '2026-05-05', berat_badan: 71 }]
    resultRef.current = { data: mockData, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(
      () => useMeasurements('u1', { enabled: true }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(chain.gte).not.toHaveBeenCalled()
    expect(chain.lte).not.toHaveBeenCalled()
    expect(result.current.data).toEqual(mockData)
  })

  it('remains backward compatible with boolean second argument', async () => {
    const mockData = [{ id: '4', user_id: 'u1', tanggal: '2026-05-05', berat_badan: 71 }]
    resultRef.current = { data: mockData, error: null }

    const { wrapper } = createQueryWrapper()
    const { result } = renderHook(() => useMeasurements('u1', true), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockData)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useMeasurement.test.js`
Expected: 3 new tests FAIL because `useMeasurements` does not accept options object yet.

- [ ] **Step 3: Add options parameter to `useMeasurements`**

Replace the entire file contents of `src/hooks/useMeasurement.js`:

```js
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useMeasurements(userId, optionsOrEnabled = true) {
  const options =
    typeof optionsOrEnabled === 'boolean'
      ? { enabled: optionsOrEnabled, dateFrom: undefined, dateTo: undefined }
      : {
          enabled: optionsOrEnabled.enabled ?? true,
          dateFrom: optionsOrEnabled.dateFrom,
          dateTo: optionsOrEnabled.dateTo,
        }
  const { enabled, dateFrom, dateTo } = options

  return useQuery({
    queryKey: ['assessments', userId, { dateFrom, dateTo }],
    enabled: Boolean(userId) && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase.from('assessments').select('*').eq('user_id', userId)
      if (dateFrom) q = q.gte('tanggal', dateFrom)
      if (dateTo) q = q.lte('tanggal', dateTo)
      q = q.order('tanggal', { ascending: true }).order('created_at', { ascending: true })
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useMeasurement.test.js`
Expected: All tests PASS (5 total — 2 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMeasurement.js src/hooks/useMeasurement.test.js
git commit -m "feat: add date range filtering to useMeasurements hook"
```

---

### Task 2: Create `DateRangeFilter` component

**Files:**
- Create: `src/components/shared/DateRangeFilter.jsx`
- Create: `src/components/shared/DateRangeFilter.test.jsx`

- [ ] **Step 1: Write the component**

Create `src/components/shared/DateRangeFilter.jsx`:

```jsx
import { DatePicker } from '@/components/ui/date-picker'
import { compareIsoDates } from '@/lib/foodLogRange'

export function DateRangeFilter({ dateFrom, dateTo, onChange }) {
  function handleFromChange(newFrom) {
    if (!newFrom || !dateTo) return onChange({ dateFrom: newFrom, dateTo })
    // Auto-swap if from > to
    if (compareIsoDates(newFrom, dateTo) > 0) {
      onChange({ dateFrom: dateTo, dateTo: newFrom })
    } else {
      onChange({ dateFrom: newFrom, dateTo })
    }
  }

  function handleToChange(newTo) {
    if (!dateFrom || !newTo) return onChange({ dateFrom, dateTo: newTo })
    if (compareIsoDates(dateFrom, newTo) > 0) {
      onChange({ dateFrom: newTo, dateTo: dateFrom })
    } else {
      onChange({ dateFrom, dateTo: newTo })
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-foreground">Dari</label>
        <DatePicker value={dateFrom} onChange={handleFromChange} placeholder="DD-MM-YYYY" />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-foreground">Sampai</label>
        <DatePicker value={dateTo} onChange={handleToChange} placeholder="DD-MM-YYYY" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the test**

Create `src/components/shared/DateRangeFilter.test.jsx`:

```jsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateRangeFilter } from './DateRangeFilter'

// Mock DatePicker to avoid complex popover rendering — just exercise parent logic
vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: vi.fn(({ value, onChange, placeholder }) => (
    <input
      data-testid={`datepicker-${placeholder}`}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )),
}))

describe('DateRangeFilter', () => {
  it('renders two date inputs with labels', () => {
    render(<DateRangeFilter dateFrom="2026-05-01" dateTo="2026-05-09" onChange={vi.fn()} />)
    expect(screen.getByText('Dari')).toBeInTheDocument()
    expect(screen.getByText('Sampai')).toBeInTheDocument()
    const inputs = screen.getAllByTestId('datepicker-DD-MM-YYYY')
    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toHaveValue('2026-05-01')
    expect(inputs[1]).toHaveValue('2026-05-09')
  })

  it('calls onChange when "Dari" date changes', async () => {
    const onChange = vi.fn()
    render(<DateRangeFilter dateFrom="2026-05-01" dateTo="2026-05-09" onChange={onChange} />)
    const inputs = screen.getAllByPlaceholderText('DD-MM-YYYY')
    await userEvent.clear(inputs[0])
    await userEvent.type(inputs[0], '2026-05-03')
    expect(onChange).toHaveBeenCalled()
  })

  it('auto-swaps dates when from > to', async () => {
    const onChange = vi.fn()
    render(<DateRangeFilter dateFrom="2026-05-01" dateTo="2026-05-09" onChange={onChange} />)
    const inputs = screen.getAllByPlaceholderText('DD-MM-YYYY')
    // Type a "Dari" date after "Sampai"
    await userEvent.clear(inputs[0])
    await userEvent.type(inputs[0], '2026-05-15')
    // onChange should swap: from=05-09, to=05-15
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall.dateFrom).toBe('2026-05-09')
    expect(lastCall.dateTo).toBe('2026-05-15')
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/components/shared/DateRangeFilter.test.jsx`
Expected: All 3 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/DateRangeFilter.jsx src/components/shared/DateRangeFilter.test.jsx
git commit -m "feat: add DateRangeFilter component"
```

---

### Task 3: Update `ActivityLogTable` to support date range

**Files:**
- Modify: `src/components/shared/ActivityLogTable.jsx`

- [ ] **Step 1: Update props and filtering logic**

In `src/components/shared/ActivityLogTable.jsx`, change the component signature and filter logic.

**Change line 62-68** (props destructuring):

```jsx
export function ActivityLogTable({
  type = 'food',
  data,
  pageSize = 10,
  embedded = false,
  tanggal,
  dateFrom,
  dateTo,
}) {
```

**Change lines 72-88** (filter logic):

```jsx
  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Date range filter (takes precedence)
    if (dateFrom || dateTo) {
      return data.filter(item => {
        if (!item.tanggal) return false
        if (dateFrom && item.tanggal < dateFrom) return false
        if (dateTo && item.tanggal > dateTo) return false
        return true
      })
    }

    // Single date exact match (backward compat)
    if (tanggal) {
      return data.filter(item => item.tanggal === tanggal)
    }

    // Default: last 14 days
    const today = new Date()
    const twoWeeksAgo = subDays(today, 14)
    const minTanggal = toIsoDateLocal(twoWeeksAgo)

    return data.filter(item => {
      if (!item.tanggal) return false
      return item.tanggal >= minTanggal
    })
  }, [data, tanggal, dateFrom, dateTo])
```

- [ ] **Step 2: Run existing tests to verify no regression**

Run: `npx vitest run src/components/shared/ --passWithNoTests`
Expected: Check if any existing tests in shared/components exist and pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ActivityLogTable.jsx
git commit -m "feat: add date range support to ActivityLogTable"
```

---

### Task 4: Update `SectionAccordion` to pass date range through

**Files:**
- Modify: `src/components/participants/SectionAccordion.jsx`

- [ ] **Step 1: Accept and pass `dateFrom`/`dateTo` props**

In `src/components/participants/SectionAccordion.jsx`, change the component signature and range logic.

**Change lines 25-45:**

```jsx
export function SectionAccordion({
  participantId,
  foodLogs,
  tanggal,
  dateFrom,
  dateTo,
}) {
  // Compute effective range: if both tanggal and dateFrom/dateTo provided,
  // tanggal takes priority (single-day range)
  const effectiveFrom = tanggal ?? dateFrom
  const effectiveTo = tanggal ?? dateTo

  const { data: exerciseLogs = [] } = useExerciseLogsForUser(participantId, {
    enabled: Boolean(participantId),
    ...(effectiveFrom || effectiveTo
      ? { dateFrom: effectiveFrom, dateTo: effectiveTo }
      : {
          // Default: last 2 weeks
          dateFrom: (() => {
            const today = new Date()
            const twoWeeksAgo = new Date(today)
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
            return twoWeeksAgo.toISOString().slice(0, 10)
          })(),
          dateTo: new Date().toISOString().slice(0, 10),
        }
    ),
  })
```

**Change line 58** (pass dateFrom/dateTo to ActivityLogTable):

```jsx
            foodLogs={foodLogs}
            exerciseLogs={exerciseLogs}
            tanggal={tanggal}
            dateFrom={effectiveFrom}
            dateTo={effectiveTo}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/participants/SectionAccordion.jsx
git commit -m "feat: add date range prop passthrough to SectionAccordion"
```

---

### Task 5: Integrate `DateRangeFilter` into `ParticipantDetail`

**Files:**
- Modify: `src/pages/ahli-gizi/ParticipantDetail.jsx`

- [ ] **Step 1: Add imports, date range state, and wire everything together**

**Change line 1** (add `subDays` import and `toIsoDateLocal`):

```jsx
import { differenceInYears, format, subDays } from 'date-fns'
```

**Change line 10** (add `toIsoDateLocal` import):

```jsx
import { getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
```

Change to:

```jsx
import { toIsoDateLocal } from '@/lib/format'
import { getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
```

**Add import** after line 16 (before `export function`):

```jsx
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
```

**Add state** after `const [selectedMetric, setSelectedMetric] = useState('berat_badan')` (after line 19):

```jsx
  const [dateFrom, setDateFrom] = useState(() => toIsoDateLocal(subDays(new Date(), 13)))
  const [dateTo, setDateTo] = useState(() => toIsoDateLocal(new Date()))
```

**Change line 35** (pass date range to `useMeasurements`):

```jsx
  const { data: measurements = [] } = useMeasurements(id, { enabled: Boolean(id), dateFrom, dateTo })
```

**Change line 36** (pass date range to `useFoodLogsForUser`):

```jsx
  const { data: logs = [] } = useFoodLogsForUser(id, { enabled: Boolean(id), dateFrom, dateTo })
```

**Insert DateRangeFilter** between the Vital Metrics Grid and Progress Timeline — after line 157 (the closing `</div>` of the grid), add:

```jsx

      {/* Date Range Filter */}
      <div className="mb-4">
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={({ dateFrom: newFrom, dateTo: newTo }) => {
            setDateFrom(newFrom)
            setDateTo(newTo)
          }}
        />
      </div>
```

**Change line 170** (pass date range to `SectionAccordion`):

```jsx
      <SectionAccordion
        participantId={id}
        foodLogs={logs}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Manual verification**

Verify the page loads correctly:
1. DateRangeFilter shows default last 14 days
2. Changing dates filters Progress Timeline data
3. Changing dates filters food/exercise logs in SectionAccordion
4. Vital Metric Cards show latest data regardless of range

- [ ] **Step 5: Commit**

```bash
git add src/pages/ahli-gizi/ParticipantDetail.jsx
git commit -m "feat: integrate date range filter into ParticipantDetail"
```
