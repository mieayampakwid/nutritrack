import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInYears } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { LargeNumericKeypad } from '@/components/staff/LargeNumericKeypad'
import { useAuth } from '@/hooks/useAuth'
import { calculateBMI, getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
import {
  CALORIE_ACTIVITY_OPTIONS as ACTIVITY,
  CALORIE_STRESS_OPTIONS as STRESS,
} from '@/lib/calorieFactors'
import { formatNumberId, parseIsoDateLocal } from '@/lib/format'
import { harrisBenedictBmr } from '@/lib/harrisBenedict'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function appendDigit(raw, d) {
  if (d === '.') {
    if (raw.includes('.')) return raw
    return raw === '' ? '0.' : `${raw}.`
  }
  if (raw === '0' && d !== '.') return d
  return `${raw}${d}`
}

function backspaceStr(raw) {
  return raw.slice(0, -1)
}

function parseNum(s) {
  const n = Number(String(s).replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

function changeDecimalField(setter) {
  return (e) => {
    let s = e.target.value.replace(',', '.')
    if (s === '') {
      setter('')
      return
    }
    if (/^\d*\.?\d*$/.test(s)) setter(s)
  }
}

function changeAgeDigits(setter) {
  return (e) => {
    let s = e.target.value.replace(/\D/g, '')
    if (s.length > 3) s = s.slice(0, 3)
    if (s === '') {
      setter('')
      return
    }
    const n = parseInt(s, 10)
    if (n > 150) return
    setter(s)
  }
}

function profileFormKey(client) {
  return [
    client.berat_badan ?? '',
    client.tinggi_badan ?? '',
    client.jenis_kelamin ?? '',
    client.tgl_lahir ?? '',
  ].join('|')
}

function ClientUserDataEntryForm({ client, clientId, listPath }) {
  const qc = useQueryClient()
  const { profile: staff } = useAuth()

  const [expanded, setExpanded] = useState(null)
  const [keypad, setKeypad] = useState(null)

  const [bbStr, setBbStr] = useState(() =>
    client.berat_badan != null ? String(client.berat_badan) : '',
  )
  const [tbStr, setTbStr] = useState(() =>
    client.tinggi_badan != null ? String(client.tinggi_badan) : '',
  )
  const [sex, setSex] = useState(() =>
    client.jenis_kelamin === 'male' || client.jenis_kelamin === 'female' ? client.jenis_kelamin : 'male',
  )
  const [ageStr, setAgeStr] = useState('')
  const [activity, setActivity] = useState(String(ACTIVITY[1].value))
  const [stress, setStress] = useState(String(STRESS[0].value))

  const derivedAge = useMemo(() => {
    if (!client?.tgl_lahir) return null
    const birth = parseIsoDateLocal(client.tgl_lahir.slice(0, 10))
    if (!birth) return null
    return differenceInYears(new Date(), birth)
  }, [client])

  const ageYears = derivedAge ?? parseNum(ageStr)

  const bb = parseNum(bbStr)
  const tb = parseNum(tbStr)
  const bmi = calculateBMI(bb, tb)
  const bmiCat = getBMICategoryAsiaPacific(bmi)

  const actNum = parseNum(activity)
  const strNum = parseNum(stress)
  const bmr = harrisBenedictBmr({ sex, bbKg: bb, tbCm: tb, ageYears })
  const totalEnergy =
    bmr != null && Number.isFinite(actNum) && Number.isFinite(strNum)
      ? Math.round(bmr * actNum * strNum * 10) / 10
      : null

  const saveBmi = useMutation({
    mutationFn: async () => {
      const berat = parseNum(bbStr)
      const tinggi = parseNum(tbStr)
      if (!Number.isFinite(berat) || berat <= 0) throw new Error('Berat badan tidak valid.')
      if (!Number.isFinite(tinggi) || tinggi <= 0) throw new Error('Tinggi badan tidak valid.')
      const { error } = await supabase
        .from('profiles')
        .update({ berat_badan: berat, tinggi_badan: tinggi })
        .eq('id', clientId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Data BMI disimpan.')
      qc.invalidateQueries({ queryKey: ['profile', clientId] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal menyimpan.'),
  })

  const saveAssessment = useMutation({
    mutationFn: async () => {
      if (!staff?.id) throw new Error('Sesi tidak valid.')
      if (totalEnergy == null) throw new Error('Lengkapi data untuk menghitung kebutuhan energi.')
      const { error } = await supabase.from('assessments').insert({
        user_id: clientId,
        faktor_aktivitas: actNum,
        faktor_stres: strNum,
        energi_total: totalEnergy,
        created_by: staff.id,
      })
      if (error) throw error
      const { error: e2 } = await supabase
        .from('profiles')
        .update({ jenis_kelamin: sex })
        .eq('id', clientId)
      if (e2) throw e2
    },
    onSuccess: () => {
      toast.success('Asesmen klinis disimpan.')
      qc.invalidateQueries({ queryKey: ['profile', clientId] })
      qc.invalidateQueries({ queryKey: ['assessments', clientId] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal menyimpan.'),
  })

  function applyKeypadDigit(d) {
    if (!keypad) return
    const { field } = keypad
    if (field === 'bb') setBbStr((s) => appendDigit(s, d))
    if (field === 'tb') setTbStr((s) => appendDigit(s, d))
    if (field === 'age') {
      if (d === '.') return
      setAgeStr((s) => {
        const next = `${s}${d}`.replace(/\D/g, '')
        if (next.length > 3) return s
        const n = parseInt(next, 10)
        if (n > 150) return s
        return next
      })
    }
  }

  function applyKeypadBackspace() {
    if (!keypad) return
    const { field } = keypad
    if (field === 'bb') setBbStr((s) => backspaceStr(s))
    if (field === 'tb') setTbStr((s) => backspaceStr(s))
    if (field === 'age') setAgeStr((s) => backspaceStr(s))
  }

  function toggleCard(next) {
    setExpanded((cur) => (cur === next ? null : next))
    setKeypad(null)
  }

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-4 pb-[min(22rem,45vh)] landscape:max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to={`${listPath}/${clientId}`}>
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        </div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Entri data klien</h1>
        <p className="text-sm text-muted-foreground">{client.nama}</p>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:px-5"
            onClick={() => toggleCard('bmi')}
            aria-expanded={expanded === 'bmi'}
          >
            <CardTitle className="text-base font-semibold">A — Data BMI</CardTitle>
            <ChevronDown
              className={cn('h-5 w-5 shrink-0 transition-transform', expanded === 'bmi' && 'rotate-180')}
              aria-hidden
            />
          </button>
          {expanded === 'bmi' ? (
            <CardContent className="space-y-4 border-t px-4 pb-5 pt-4 sm:px-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bb-in">Berat badan (kg)</Label>
                  <Input
                    id="bb-in"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="tabular-nums"
                    value={bbStr}
                    onChange={changeDecimalField(setBbStr)}
                    onFocus={() => setKeypad({ field: 'bb', allowDecimal: true })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tb-in">Tinggi badan (cm)</Label>
                  <Input
                    id="tb-in"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="tabular-nums"
                    value={tbStr}
                    onChange={changeDecimalField(setTbStr)}
                    onFocus={() => setKeypad({ field: 'tb', allowDecimal: true })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-sm">
                <p>
                  <span className="text-muted-foreground">BMI: </span>
                  <span className="font-semibold tabular-nums">{bmi != null ? formatNumberId(bmi) : '—'}</span>
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Kategori (WHO Asia–Pasifik): </span>
                  <span className="font-medium">{bmiCat.label}</span>
                </p>
              </div>
              <Button
                type="button"
                disabled={saveBmi.isPending}
                onClick={() => saveBmi.mutate()}
                className="w-full sm:w-auto"
              >
                Simpan BMI
              </Button>
            </CardContent>
          ) : null}
        </Card>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:px-5"
            onClick={() => toggleCard('assessment')}
            aria-expanded={expanded === 'assessment'}
          >
            <CardTitle className="text-base font-semibold">B — Asesmen klinis (Harris–Benedict)</CardTitle>
            <ChevronDown
              className={cn(
                'h-5 w-5 shrink-0 transition-transform',
                expanded === 'assessment' && 'rotate-180',
              )}
              aria-hidden
            />
          </button>
          {expanded === 'assessment' ? (
            <CardContent className="space-y-4 border-t px-4 pb-5 pt-4 sm:px-5">
              <div className="space-y-2">
                <Label>Jenis kelamin</Label>
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
                BB &amp; TB memakai nilai pada kartu A (disimpan di profil). Umur:{' '}
                {derivedAge != null ? (
                  <span className="font-medium text-foreground">{derivedAge} tahun</span>
                ) : (
                  'isi tanggal lahir di profil admin, atau masukkan umur manual di bawah.'
                )}
              </p>
              {derivedAge == null ? (
                <div className="space-y-1.5">
                  <Label htmlFor="age-in">Umur (tahun)</Label>
                  <Input
                    id="age-in"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className="tabular-nums"
                    value={ageStr}
                    onChange={changeAgeDigits(setAgeStr)}
                    onFocus={() => setKeypad({ field: 'age', allowDecimal: false })}
                    placeholder="0"
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label>Faktor aktivitas</Label>
                <Select value={activity} onValueChange={setActivity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY.map((a) => (
                      <SelectItem key={a.value} value={String(a.value)}>
                        {a.range ? `${a.label} (${a.range})` : a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Faktor stres</Label>
                <Select value={stress} onValueChange={setStress}>
                  <SelectTrigger className="min-h-11 whitespace-normal text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {STRESS.map((s) => (
                      <SelectItem key={s.value} value={String(s.value)} className="whitespace-normal py-2">
                        <span className="font-medium">{s.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">Rentang {s.range}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-sm">
                <p>
                  <span className="text-muted-foreground">BMR (perkiraan): </span>
                  <span className="font-semibold tabular-nums">
                    {bmr != null ? `${formatNumberId(bmr)} kkal/hari` : '—'}
                  </span>
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Total kebutuhan energi: </span>
                  <span className="font-semibold tabular-nums text-primary">
                    {totalEnergy != null ? `${formatNumberId(totalEnergy)} kkal/hari` : '—'}
                  </span>
                </p>
              </div>

              <Button
                type="button"
                disabled={saveAssessment.isPending || totalEnergy == null}
                onClick={() => saveAssessment.mutate()}
                className="w-full sm:w-auto"
              >
                Simpan asesmen
              </Button>
            </CardContent>
          ) : null}
        </Card>
      </div>

      <LargeNumericKeypad
        open={Boolean(keypad)}
        allowDecimal={keypad?.allowDecimal !== false}
        onInput={applyKeypadDigit}
        onBackspace={applyKeypadBackspace}
        onDone={() => setKeypad(null)}
      />
    </>
  )
}

export function ClientUserDataEntry() {
  const { id: clientId } = useParams()
  const location = useLocation()
  const listPath = location.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'

  const { data: client, isLoading } = useQuery({
    queryKey: ['profile', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', clientId).single()
      if (error) throw error
      return data
    },
  })

  if (isLoading || !clientId) {
    return (
      <AppShell>
        <LoadingSpinner />
      </AppShell>
    )
  }

  if (!client || client.role !== 'klien') {
    return (
      <AppShell>
        <p className="text-muted-foreground">Klien tidak ditemukan.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to={listPath}>Kembali</Link>
        </Button>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <ClientUserDataEntryForm
        key={`${clientId}:${profileFormKey(client)}`}
        client={client}
        clientId={clientId}
        listPath={listPath}
      />
    </AppShell>
  )
}
