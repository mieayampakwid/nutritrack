import { useState, useMemo } from 'react'
import { differenceInYears } from 'date-fns'
import { Save } from 'lucide-react'
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

const ACTIVITY = [
  { label: 'Bed Rest (Istirahat)', value: 1.1 },
  { label: 'Normal (Tidak bed rest)', value: 1.2 },
]

const STRESS = [
  { label: 'No stress (Tidak ada stress)', value: 1.2 },
  { label: 'Mild stress (Stres ringan)', desc: 'Peradangan saluran cerna, kanker, bedah efektif, trauma, demam', value: 1.3 },
  { label: 'Moderate stress (Stres sedang)', desc: 'Sepsis, bedah tulang, luka bakar, penyakit hati', value: 1.4 },
  { label: 'Severe stress (Stres berat)', desc: 'HIV/AIDS, bedah multistem, TB paru, komplikasi', value: 1.5 },
  { label: 'Head injury (Luka kepala berat)', desc: 'Luka kepala berat', value: 1.7 },
]

function harrisBenedictBmr({ sex, bbKg, tbCm, ageYears }) {
  if (!Number.isFinite(ageYears) || ageYears < 1 || !Number.isFinite(bbKg) || !Number.isFinite(tbCm)) {
    return null
  }
  if (sex === 'male') return 66 + (13.7 * bbKg) + (5 * tbCm) - (6.8 * ageYears)
  if (sex === 'female') return 655 + (9.6 * bbKg) + (1.8 * tbCm) - (4.7 * ageYears)
  return null
}

export function AssessmentForm({ client, lastAssessment, onSave, isSaving }) {
  const today = new Date().toISOString().slice(0, 10)

  // Form state
  const tanggal = today
  const [bbStr, setBbStr] = useState(() => lastAssessment?.berat_badan != null ? String(lastAssessment.berat_badan) : '')
  const [tbStr, setTbStr] = useState(() => lastAssessment?.tinggi_badan != null ? String(lastAssessment.tinggi_badan) : '')
  const [muscleStr, setMuscleStr] = useState(() => lastAssessment?.massa_otot != null ? String(lastAssessment.massa_otot) : '')
  const [fatStr, setFatStr] = useState(() => lastAssessment?.massa_lemak != null ? String(lastAssessment.massa_lemak) : '')
  const [waistStr, setWaistStr] = useState(() => lastAssessment?.lingkar_pinggang != null ? String(lastAssessment.lingkar_pinggang) : '')
  const [sex, setSex] = useState(() => (client.jenis_kelamin === 'male' || client.jenis_kelamin === 'female' ? client.jenis_kelamin : 'female'))
  const [activity, setActivity] = useState(() => lastAssessment?.faktor_aktivitas != null ? String(lastAssessment.faktor_aktivitas) : '1.2')
  const [stress, setStress] = useState(() => lastAssessment?.faktor_stres != null ? String(lastAssessment.faktor_stres) : '1.2')
  const [catatan, setCatatan] = useState(() => lastAssessment?.catatan_asesmen || '')

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
      umur: derivedAge || null,
      faktor_aktivitas: actNum,
      faktor_stres: strNum,
      bmi,
      bmr,
      energi_total: totalEnergy,
      catatan_asesmen: catatan.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
      <div className="flex justify-end sm:justify-end">
        <Button
          type="submit"
          disabled={!isValid || isSaving}
          className="w-full sm:w-auto"
          size="lg"
        >
          <Save className="mr-2 h-5 w-5" />
          {isSaving ? 'Menyimpan...' : 'Simpan Asesmen'}
        </Button>
      </div>
    </form>
  )
}
