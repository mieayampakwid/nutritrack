# Participant Assessment Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the clinical assessment data entry page with modern "Clinical Journal" aesthetic, adding evaluation notes functionality.

**Architecture:** Single-page form with real-time calculations, two-table save pattern (body_measurements + assessments), clean typography-focused design matching ParticipantDetail.

**Tech Stack:** React 19, TanStack Query 5, Supabase (Postgres), Tailwind CSS 4, date-fns

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migration_add_assessment_notes.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add catatan column to assessments table for evaluation notes
ALTER TABLE public.assessments
ADD COLUMN catatan TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.assessments.catatan IS 'Free-form evaluation notes from dietitian';
```

- [ ] **Step 2: Run migration on Supabase**

Run: Apply via Supabase dashboard or execute SQL directly on your database
Expected: Column added successfully, no errors

- [ ] **Step 3: Verify the change**

Run: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'catatan';`
Expected: Row showing catatan column with text data type

- [ ] **Step 4: Commit migration file**

```bash
git add supabase/migration_add_assessment_notes.sql
git commit -m "db: add catatan column to assessments for evaluation notes"
```

---

## Task 2: Create AssessmentForm Component

**Files:**
- Create: `src/components/participants/AssessmentForm.jsx`
- Create: `src/components/participants/AssessmentForm.test.js`

- [ ] **Step 1: Write the test file skeleton**

```jsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssessmentForm } from './AssessmentForm'

const mockClient = {
  id: 'client-1',
  nama: 'Test Client',
  jenis_kelamin: 'female',
  tgl_lahir: '1990-01-01',
}

const mockLastMeasurement = {
  berat_badan: 65.5,
  tinggi_badan: 165,
  massa_otot: 28,
  massa_lemak: 25,
  lingkar_pinggang: 80,
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('AssessmentForm', () => {
  it('renders form with client data pre-populated', () => {
    render(
      <AssessmentForm
        client={mockClient}
        lastMeasurement={mockLastMeasurement}
        onSave={vi.fn()}
        isSaving={false}
      />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByDisplayValue('65.5')).toBeInTheDocument() // weight
    expect(screen.getByDisplayValue('165')).toBeInTheDocument() // height
  })

  it('calculates BMI correctly', () => {
    render(
      <AssessmentForm
        client={mockClient}
        lastMeasurement={mockLastMeasurement}
        onSave={vi.fn()}
        isSaving={false}
      />,
      { wrapper: createWrapper() }
    )
    // BMI = 65.5 / (1.65)^2 = 24.07
    expect(screen.getByText(/24.\d/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AssessmentForm.test`
Expected: FAIL with "AssessmentForm not found"

- [ ] **Step 3: Write the AssessmentForm component**

```jsx
import { useState, useMemo } from 'react'
import { differenceInYears } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { calculateBMI, getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
import { formatNumberId, parseIsoDateLocal } from '@/lib/format'
import { cn } from '@/lib/utils'

const ACTIVITY = [
  { label: 'Bed Rest', value: 1.15 },
  { label: 'Normal (not bed rest)', value: 1.25 },
]

const STRESS = [
  { label: 'No stress', value: 1.25 },
  { label: 'Mild stress', desc: 'GI inflammation, cancer, elective surgery, trauma, fever', value: 1.35 },
  { label: 'Moderate stress', desc: 'Sepsis, bone surgery, burns, liver disease', value: 1.45 },
  { label: 'Severe stress', desc: 'HIV/AIDS, multi-system surgery, pulmonary TB, complications', value: 1.55 },
  { label: 'Severe stress — head injury', desc: 'Head injury', value: 1.7 },
]

function harrisBenedictBmr({ sex, bbKg, tbCm, ageYears }) {
  if (!Number.isFinite(ageYears) || ageYears < 1 || !Number.isFinite(bbKg) || !Number.isFinite(tbCm)) {
    return null
  }
  if (sex === 'male') return 66 + 13.7 * bbKg + 5 * tbCm - 6.8 * ageYears
  if (sex === 'female') return 655 + 9.6 * bbKg + 1.8 * tbCm - 4.7 * ageYears
  return null
}

export function AssessmentForm({ client, lastMeasurement, onSave, isSaving }) {
  const today = new Date().toISOString().slice(0, 10)

  // Form state
  const [tanggal, setTanggal] = useState(today)
  const [bbStr, setBbStr] = useState(() => lastMeasurement?.berat_badan != null ? String(lastMeasurement.berat_badan) : '')
  const [tbStr, setTbStr] = useState(() => lastMeasurement?.tinggi_badan != null ? String(lastMeasurement.tinggi_badan) : '')
  const [muscleStr, setMuscleStr] = useState(() => lastMeasurement?.massa_otot != null ? String(lastMeasurement.massa_otot) : '')
  const [fatStr, setFatStr] = useState(() => lastMeasurement?.massa_lemak != null ? String(lastMeasurement.massa_lemak) : '')
  const [waistStr, setWaistStr] = useState(() => lastMeasurement?.lingkar_pinggang != null ? String(lastMeasurement.lingkar_pinggang) : '')
  const [sex, setSex] = useState(() => (client.jenis_kelamin === 'male' || client.jenis_kelamin === 'female' ? client.jenis_kelamin : 'female'))
  const [activity, setActivity] = useState('1.25')
  const [stress, setStress] = useState('1.25')
  const [catatan, setCatatan] = useState('')

  // Derived values
  const derivedAge = useMemo(() => {
    if (!client?.tgl_lahir) return null
    const birth = parseIsoDateLocal(client.tgl_lahir.slice(0, 10))
    if (!birth) return null
    return differenceInYears(new Date(), birth)
  }, [client])

  // Calculations
  const bb = parseFloat(bbStr) || null
  const tb = parseFloat(tbStr) || null
  const bmi = calculateBMI(bb, tb)
  const bmiCat = getBMICategoryAsiaPacific(bmi)

  const actNum = parseFloat(activity) || null
  const strNum = parseFloat(stress) || null
  const bmr = harrisBenedictBmr({ sex, bbKg: bb, tbCm: tb, ageYears: derivedAge })
  const totalEnergy = bmr != null && actNum != null && strNum != null
    ? Math.round(bmr * actNum * strNum * 10) / 10
    : null

  // Validation
  const isValid = bb != null && bb > 0 && tb != null && tb > 0

  // Handle save
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValid) return

    onSave({
      tanggal,
      berat_badan: bb,
      tinggi_badan: tb,
      massa_otot: parseFloat(muscleStr) || null,
      massa_lemak: parseFloat(fatStr) || null,
      lingkar_pinggang: parseFloat(waistStr) || null,
      jenis_kelamin: sex,
      faktor_aktivitas: actNum,
      faktor_stres: strNum,
      energi_total: totalEnergy,
      catatan: catatan.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {/* Anthropometric Section */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">Pengukuran Antropometri</h2>
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="bb">Berat Badan (kg) *</Label>
              <Input
                id="bb"
                type="number"
                step="0.1"
                min="0"
                max="300"
                value={bbStr}
                onChange={(e) => setBbStr(e.target.value)}
                placeholder="0"
                className="tabular-nums"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tb">Tinggi Badan (cm) *</Label>
              <Input
                id="tb"
                type="number"
                step="0.1"
                min="0"
                max="250"
                value={tbStr}
                onChange={(e) => setTbStr(e.target.value)}
                placeholder="0"
                className="tabular-nums"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="muscle">Massa Otot (kg)</Label>
              <Input
                id="muscle"
                type="number"
                step="0.1"
                min="0"
                max="200"
                value={muscleStr}
                onChange={(e) => setMuscleStr(e.target.value)}
                placeholder="0"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fat">Massa Lemak (%)</Label>
              <Input
                id="fat"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={fatStr}
                onChange={(e) => setFatStr(e.target.value)}
                placeholder="0"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waist">Lingkar Perut (cm)</Label>
              <Input
                id="waist"
                type="number"
                step="0.1"
                min="0"
                max="300"
                value={waistStr}
                onChange={(e) => setWaistStr(e.target.value)}
                placeholder="0"
                className="tabular-nums"
              />
            </div>
          </div>
          {bmi != null && (
            <div className="mt-4 rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-sm">
              <p>
                <span className="text-muted-foreground">BMI: </span>
                <span className="font-semibold tabular-nums">{formatNumberId(bmi)}</span>
                <span className="text-muted-foreground"> • {bmiCat.label}</span>
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* Clinical Assessment Section */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">Asesmen Klinis (Harris–Benedict)</h2>
        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>Jenis Kelamin</Label>
            <div className="flex flex-wrap gap-3">
              {[
                { v: 'male', l: 'Laki-laki' },
                { v: 'female', l: 'Perempuan' },
              ].map(({ v, l }) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sex"
                    value={v}
                    checked={sex === v}
                    onChange={() => setSex(v)}
                    className="size-4 accent-primary"
                  />
                  {l}
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Umur: {derivedAge != null ? <span className="font-medium text-foreground">{derivedAge} tahun</span> : '—'}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="activity">Faktor Aktivitas</Label>
            <Select value={activity} onValueChange={setActivity}>
              <SelectTrigger id="activity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY.map((a) => (
                  <SelectItem key={a.value} value={String(a.value)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stress">Faktor Stres</Label>
            <Select value={stress} onValueChange={setStress}>
              <SelectTrigger id="stress" className="min-h-11 whitespace-normal text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {STRESS.map((s) => (
                  <SelectItem key={s.value} value={String(s.value)} className="whitespace-normal py-2">
                    <span className="font-medium">{s.label}</span>
                    {s.desc !== '—' ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{s.desc}</span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">BMR (perkiraan): </span>
              <span className="font-semibold tabular-nums">
                {bmr != null ? `${formatNumberId(bmr)} kkal/hari` : '—'}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Total Kebutuhan Energi: </span>
              <span className="font-semibold tabular-nums text-primary">
                {totalEnergy != null ? `${formatNumberId(totalEnergy)} kkal/hari` : '—'}
              </span>
            </p>
          </div>
        </Card>
      </section>

      {/* Evaluation Notes Section */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">Catatan Asesmen</h2>
        <Card className="p-5">
          <div className="space-y-1.5">
            <Label htmlFor="catatan">Catatan Evaluasi</Label>
            <Textarea
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value.slice(0, 5000))}
              placeholder="Tulis catatan asesmen, rekomendasi, atau evaluasi perkembangan klien..."
              rows={6}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {catatan.length} / 5000 karakter
            </p>
          </div>
        </Card>
      </section>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border/60 backdrop-blur sm:relative sm:bg-transparent sm:border-0 sm:p-0 sm:backdrop-blur-none">
        <Button
          type="submit"
          disabled={!isValid || isSaving}
          className="w-full sm:w-auto"
          size="lg"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Asesmen'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AssessmentForm.test`
Expected: PASS

- [ ] **Step 5: Run linter**

Run: `npm run lint -- AssessmentForm.jsx`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/participants/AssessmentForm.jsx src/components/participants/AssessmentForm.test.js
git commit -m "feat: add AssessmentForm component with real-time calculations"
```

---

## Task 3: Create ParticipantAssessment Page

**Files:**
- Create: `src/pages/ahli-gizi/ParticipantAssessment.jsx`
- Create: `src/pages/ahli-gizi/ParticipantAssessment.test.js`

- [ ] **Step 1: Write the test file**

```jsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ParticipantAssessment } from './ParticipantAssessment'

const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
}

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/gizi/participants/client-1/assessment']}>
        <Routes>
          <Route path="/gizi/participants/:id/assessment" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ParticipantAssessment', () => {
  it('renders loading state', () => {
    mockSupabase.single.mockResolvedValue({ data: null, error: null })
    render(<ParticipantAssessment />, { wrapper: createWrapper() })
    // Should show loading indicator
  })

  it('renders form when client data loads', async () => {
    const mockClient = {
      id: 'client-1',
      nama: 'Test Client',
      jenis_kelamin: 'female',
      tgl_lahir: '1990-01-01',
    }
    mockSupabase.single.mockResolvedValue({ data: mockClient, error: null })
    mockSupabase.order.mockReturnValue(mockSupabase)
    mockSupabase.limit.mockResolvedValue({ data: [], error: null })

    render(<ParticipantAssessment />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Pengukuran Antropometri')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ParticipantAssessment.test`
Expected: FAIL with "ParticipantAssessment not found"

- [ ] **Step 3: Write the ParticipantAssessment page**

```jsx
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { AssessmentForm } from '@/components/participants/AssessmentForm'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { differenceInYears } from 'date-fns'
import { parseIsoDateLocal } from '@/lib/format'

export function ParticipantAssessment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile: staff } = useAuth()

  // Load client data
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['profile', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })

  // Load last measurement
  const { data: lastMeasurement } = useQuery({
    queryKey: ['body_measurements_last', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', id)
        .order('tanggal', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (!staff?.id) throw new Error('Sesi tidak valid.')
      if (!id) throw new Error('ID peserta tidak valid.')

      // Save body measurement
      const { error: measError } = await supabase
        .from('body_measurements')
        .insert({
          user_id: id,
          tanggal: data.tanggal,
          berat_badan: data.berat_badan,
          tinggi_badan: data.tinggi_badan,
          massa_otot: data.massa_otot,
          massa_lemak: data.massa_lemak,
          lingkar_pinggang: data.lingkar_pinggang,
          created_by: staff.id,
        })
      if (measError) throw measError

      // Save assessment
      const { error: assessError } = await supabase
        .from('assessments')
        .insert({
          user_id: id,
          faktor_aktivitas: data.faktor_aktivitas,
          faktor_stres: data.faktor_stres,
          energi_total: data.energi_total,
          catatan: data.catatan,
          created_by: staff.id,
        })
      if (assessError) throw assessError

      return data
    },
    onSuccess: () => {
      toast.success('Asesmen berhasil disimpan.')
      // Invalidate queries
      // Navigate back to participant detail
      navigate(`/gizi/participants/${id}`)
    },
    onError: (error) => {
      toast.error(error.message || 'Gagal menyimpan asesmen.')
    },
  })

  // Loading state
  if (loadingClient || !id) {
    return (
      <AppShell>
        <LoadingSpinner />
      </AppShell>
    )
  }

  // Error state
  if (!client || client.role !== 'klien') {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <p className="text-center text-muted-foreground">Peserta tidak ditemukan.</p>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link to="/gizi/my-group">Kembali</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          to={`/gizi/participants/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke detail peserta
        </Link>
      </div>

      {/* Client Hero */}
      <div className="mb-8 border-b border-border/60 pb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {client.nama}
          </h1>
          <p className="mt-2 text-sm text-foreground/70 sm:text-base">
            {client.tgl_lahir && (
              <span>{differenceInYears(new Date(), parseIsoDateLocal(client.tgl_lahir))} tahun • </>
            )}
            {client.jenis_kelamin === 'male' ? 'Laki-laki' : 'Perempuan'}
          </p>
        </div>
      </div>

      {/* Assessment Form */}
      <AssessmentForm
        client={client}
        lastMeasurement={lastMeasurement}
        onSave={saveMutation.mutate}
        isSaving={saveMutation.isPending}
      />
    </AppShell>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ParticipantAssessment.test`
Expected: PASS

- [ ] **Step 5: Run linter**

Run: `npm run lint -- ParticipantAssessment.jsx`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/ahli-gizi/ParticipantAssessment.jsx src/pages/ahli-gizi/ParticipantAssessment.test.js
git commit -m "feat: add ParticipantAssessment page with form integration"
```

---

## Task 4: Add Route to App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add lazy import for ParticipantAssessment**

Find the line `const GiziMyGroup = lazy(...)` and add after it:

```jsx
const ParticipantAssessment = lazy(() =>
  import('@/pages/ahli-gizi/ParticipantAssessment').then((m) => ({ default: m.ParticipantAssessment })),
)
```

- [ ] **Step 2: Add the route**

Find the `/gizi/participants/:id` route and add after it:

```jsx
<Route
  path="/gizi/participants/:id/assessment"
  element={
    <RequireAuth roles={['ahli_gizi']}>
      <ParticipantAssessment />
    </RequireAuth>
  }
/>
```

- [ ] **Step 3: Run linter**

Run: `npm run lint -- src/App.jsx`
Expected: No errors

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All 144 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add /gizi/participants/:id/assessment route"
```

---

## Task 5: Update ParticipantDetail Link

**Files:**
- Modify: `src/pages/ahli-gizi/ParticipantDetail.jsx`

- [ ] **Step 1: Find the "Tambah Data" button link**

Locate the line:
```jsx
<Link to={`/gizi/participants/${id}/data-entry`}>
```

- [ ] **Step 2: Update to use new assessment route**

Replace with:
```jsx
<Link to={`/gizi/participants/${id}/assessment`}>
```

- [ ] **Step 3: Run linter**

Run: `npm run lint -- ParticipantDetail.jsx`
Expected: No errors

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/ahli-gizi/ParticipantDetail.jsx
git commit -m "fix: update ParticipantDetail link to new assessment page"
```

---

## Task 6: Integration Testing

**Files:**
- No files created/modified

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on port 5174

- [ ] **Step 2: Navigate to my-group page**

Open: `http://localhost:5174/gizi/my-group`
Expected: Group members list displays

- [ ] **Step 3: Click on a participant**

Click on any participant in the list
Expected: ParticipantDetail page loads with vital metrics

- [ ] **Step 4: Click "Tambah Data" button**

Click the "Tambah Data" button
Expected: Navigates to `/gizi/participants/{id}/assessment`

- [ ] **Step 5: Verify form pre-population**

Check that weight, height, and other fields show last measurement values
Expected: Fields are pre-filled with existing data

- [ ] **Step 6: Test BMI calculation**

Enter weight: 70, height: 170
Expected: BMI displays ~24.2 with category

- [ ] **Step 7: Test energy calculation**

Verify activity and stress factors are selected
Expected: BMR and Total Energy display calculated values

- [ ] **Step 8: Add evaluation notes**

Enter text in the catatan textarea
Expected: Character counter updates

- [ ] **Step 9: Submit the form**

Click "Simpan Asesmen" button
Expected: Success toast, redirects to participant detail

- [ ] **Step 10: Verify data was saved**

Check that new values appear on participant detail page
Expected: Updated vital metrics show new values

- [ ] **Step 11: Test validation**

Clear weight field and try to submit
Expected: Submit button is disabled or shows validation error

- [ ] **Step 12: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 13: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 14: Final commit**

```bash
git add .
git commit -m "test: verify participant assessment integration"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Database migration applied successfully
- [ ] Route `/gizi/participants/:id/assessment` is accessible
- [ ] Form pre-populates with last measurement
- [ ] BMI calculates in real-time
- [ ] Energy calculates with all factors
- [ ] Evaluation notes save and retrieve
- [ ] Success toast displays
- [ ] Redirect works after save
- [ ] Mobile layout is functional
- [ ] All 144+ tests pass
- [ ] Lint passes
- [ ] Manual testing completed successfully
