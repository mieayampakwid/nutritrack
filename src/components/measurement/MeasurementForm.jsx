import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Minus, Plus } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { calculateBMI, getBMICategory } from '@/lib/bmiCalculator'
import { formatDateId, formatNumberId } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { bodyMeasurementSchema } from '@/lib/validators'
import { logError } from '@/lib/logger'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

function StepButton({ onClick, disabled, children }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-11 min-h-[44px] min-w-[44px] touch-manipulation text-xl [&_svg]:h-5 [&_svg]:w-5"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

function NumField({ label, value, onChange, step = 0.1, min = 0 }) {
  const n = value === '' || value == null ? null : Number(value)
  const bump = (delta) => {
    const base = n ?? 0
    const next = Math.max(min, Math.round((base + delta) * 100) / 100)
    onChange(String(next))
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <StepButton onClick={() => bump(-step)} disabled={n == null && value === ''}>
          <Minus className="h-5 w-5" />
        </StepButton>
        <Input
          inputMode="decimal"
          className="min-h-[48px] text-center font-semibold"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
        <StepButton onClick={() => bump(step)}>
          <Plus className="h-5 w-5" />
        </StepButton>
      </div>
    </div>
  )
}

const bmiText = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  yellow: 'text-amber-600',
  red: 'text-red-600',
}

export function MeasurementForm({
  targetUserId,
  staffId,
  clientProfile,
  lastMeasurement,
}) {
  const qc = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [tanggal, setTanggal] = useState(today)
  const [berat, setBerat] = useState('')
  const [tinggi, setTinggi] = useState('')
  const [otot, setOtot] = useState('')
  const [lemak, setLemak] = useState('')
  const [pinggang, setPinggang] = useState('')
  const [catatan, setCatatan] = useState('')

  const bmi = useMemo(() => {
    const bb = berat === '' ? null : Number(berat)
    const tb = tinggi === '' ? null : Number(tinggi)
    return calculateBMI(bb, tb)
  }, [berat, tinggi])

  const cat = getBMICategory(bmi)

  const mutation = useMutation({
    mutationFn: async () => {
      const bb = berat === '' ? null : Number(berat)
      const tb = tinggi === '' ? null : Number(tinggi)
      const mo = otot === '' ? null : Number(otot)
      const ml = lemak === '' ? null : Number(lemak)
      const lp = pinggang === '' ? null : Number(pinggang)
      if (!tanggal) throw new Error('Tanggal wajib diisi.')
      if (bb == null || tb == null) throw new Error('Berat dan tinggi badan wajib diisi.')

      const vResult = bodyMeasurementSchema.safeParse({
        tanggal,
        berat_badan: bb,
        tinggi_badan: tb,
        massa_otot: mo,
        massa_lemak: ml,
        lingkar_pinggang: lp,
        catatan: catatan.trim() || undefined,
      })
      if (!vResult.success) {
        throw new Error(vResult.error.issues[0].message)
      }

      const row = {
        user_id: targetUserId,
        tanggal,
        berat_badan: bb,
        tinggi_badan: tb,
        massa_otot: mo,
        massa_lemak: ml,
        lingkar_pinggang: lp,
        bmi: calculateBMI(bb, tb),
        catatan: catatan.trim() || null,
        created_by: staffId ?? null,
      }

      const { error } = await supabase.from('body_measurements').upsert(row, {
        onConflict: 'user_id,tanggal',
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Pengukuran disimpan.')
      qc.invalidateQueries({ queryKey: ['measurements', targetUserId] })
      setCatatan('')
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menyimpan.')
      logError('MeasurementForm.mutate', e)
    },
  })

  const initials =
    clientProfile?.nama
      ?.split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '?'

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
        <Card className={cn('lg:min-h-[360px] md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary text-3xl font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {clientProfile?.nama ?? 'Klien'}
                </h2>
                <p className="text-muted-foreground">
                  {clientProfile?.instalasi ?? '—'}
                </p>
              </div>
              <Card className="w-full border bg-muted/40 shadow-none">
                <CardContent className="p-4 text-sm">
                  <p className="font-medium">Pengukuran terakhir</p>
                  {lastMeasurement ? (
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      <li>Tanggal: {formatDateId(lastMeasurement.tanggal)}</li>
                      <li>
                        BB: {formatNumberId(lastMeasurement.berat_badan)} kg · TB:{' '}
                        {formatNumberId(lastMeasurement.tinggi_badan)} cm
                      </li>
                      <li>BMI: {formatNumberId(lastMeasurement.bmi)}</li>
                      {lastMeasurement.lingkar_pinggang != null ? (
                        <li>
                          Lingkar pinggang: {formatNumberId(lastMeasurement.lingkar_pinggang)} cm
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="mt-2 text-muted-foreground">Belum ada data.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className={cn('md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="tanggal-ukur">Tanggal</Label>
              <DatePicker
                id="tanggal-ukur"
                value={tanggal}
                onChange={setTanggal}
                className="min-h-[48px]"
              />
            </div>

            <NumField label="Berat badan (kg)" value={berat} onChange={setBerat} step={0.1} />
            <NumField label="Tinggi badan (cm)" value={tinggi} onChange={setTinggi} step={0.5} />
            <NumField label="Massa otot (kg)" value={otot} onChange={setOtot} step={0.1} />
            <NumField label="Massa lemak (%)" value={lemak} onChange={setLemak} step={0.1} />
            <NumField
              label="Lingkar pinggang (cm)"
              value={pinggang}
              onChange={setPinggang}
              step={0.5}
            />

            <Card className="border bg-muted/30 shadow-none">
              <CardContent className="space-y-1 p-4">
                <p className="text-sm text-muted-foreground">BMI (otomatis)</p>
                <p
                  className={cn(
                    'text-4xl font-bold tabular-nums',
                    bmi != null ? bmiText[cat.color] ?? '' : 'text-muted-foreground',
                  )}
                >
                  {bmi != null ? formatNumberId(bmi) : '—'}
                </p>
                {bmi != null && (
                  <p className="text-sm font-medium">{cat.label}</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="catatan-ukur">Catatan</Label>
              <Textarea
                id="catatan-ukur"
                rows={3}
                className="min-h-[80px]"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>

            <Button
              type="button"
              className="h-14 w-full text-lg"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
