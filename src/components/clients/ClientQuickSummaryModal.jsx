import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInYears } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { logError } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { calculateBMI, getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
import { APP_DISPLAY_NAME } from '@/lib/appMeta'
import { compareIsoDates } from '@/lib/foodLogRange'
import { formatNumberId, parseIsoDateLocal, toIsoDateLocal } from '@/lib/format'
import { normalizeIndonesiaWhatsAppDigits } from '@/lib/whatsappPhone'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function sexLabel(v) {
  if (v === 'male') return 'Laki-laki'
  if (v === 'female') return 'Perempuan'
  return '—'
}

const EVAL_LABEL = 'text-xs font-medium leading-snug sm:text-sm'

function ClientQuickSummaryBody({ clientId, linkPrefix }) {
  const { profile: staff } = useAuth()
  const qc = useQueryClient()
  const [resumeOpen, setResumeOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [evalDateFrom, setEvalDateFrom] = useState('')
  const [evalDateTo, setEvalDateTo] = useState('')
  const [exerciseFreq, setExerciseFreq] = useState('')
  const [sleepEnough, setSleepEnough] = useState('')
  const [vegTimesPerDay, setVegTimesPerDay] = useState('')
  const [evalBmiStr, setEvalBmiStr] = useState('')

  const { data: client, isLoading } = useQuery({
    queryKey: ['profile', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', clientId).single()
      if (error) throw error
      return data
    },
  })

  const { data: latestAssessment } = useQuery({
    queryKey: ['assessments', clientId, 'latest'],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      return data?.[0] ?? null
    },
  })

  const age = useMemo(() => {
    if (!client?.tgl_lahir) return null
    const birth = parseIsoDateLocal(client.tgl_lahir.slice(0, 10))
    if (!birth) return null
    return differenceInYears(new Date(), birth)
  }, [client])

  const bmi = calculateBMI(client?.berat_badan, client?.tinggi_badan)
  const bmiCat = getBMICategoryAsiaPacific(bmi)
  const energy = latestAssessment?.energi_total

  const { dateFrom: evalRangeFrom, dateTo: evalRangeTo } = useMemo(() => {
    let a = evalDateFrom
    let b = evalDateTo
    if (a && b && compareIsoDates(a, b) > 0) {
      ;[a, b] = [b, a]
    }
    return { dateFrom: a, dateTo: b }
  }, [evalDateFrom, evalDateTo])
  const evalRangeReady = Boolean(evalRangeFrom && evalRangeTo)

  const saveEvaluation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error('Klien tidak valid.')
      if (!evalRangeReady) throw new Error('Tanggal mulai dan selesai wajib diisi.')

      const veg = vegTimesPerDay === '' ? null : Number(vegTimesPerDay)
      const bmiNum = evalBmiStr.trim() === '' ? null : Number(evalBmiStr)
      if (veg != null && (!Number.isFinite(veg) || veg < 0)) {
        throw new Error('Konsumsi sayur harus berupa angka >= 0.')
      }
      if (bmiNum != null && (!Number.isFinite(bmiNum) || bmiNum <= 0)) {
        throw new Error('BMI harus berupa angka > 0.')
      }

      const payload = {
        user_id: clientId,
        date_from: evalRangeFrom,
        date_to: evalRangeTo,
        exercise_freq: exerciseFreq.trim() || null,
        sleep_enough: sleepEnough === '' ? null : sleepEnough === 'yes',
        veg_times_per_day: veg,
        usage_notes: notes.trim() || null,
        bmi: bmiNum,
        created_by: staff?.id ?? null,
      }

      const { error } = await supabase.from('user_evaluations').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Evaluasi disimpan.')
      qc.invalidateQueries({ queryKey: ['user_evaluations', clientId] })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menyimpan evaluasi.')
      logError('ClientQuickSummary.evalMutation', e)
    },
  })

  function toggleResume() {
    setResumeOpen((v) => {
      const next = !v
      if (!v && next) {
        const t = toIsoDateLocal(new Date())
        setEvalDateFrom(t)
        setEvalDateTo(t)
        setEvalBmiStr(bmi != null ? String(bmi) : '')
      }
      return next
    })
  }

  const { data: phone } = useQuery({
    queryKey: ['admin_user_phone', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_user_phone', { p_user_id: clientId })
      if (error) throw error
      return data ?? ''
    },
  })

  const waDigits = normalizeIndonesiaWhatsAppDigits(phone)

  const messageBody = useMemo(() => {
    if (!client) return ''
    const lines = [
      `Assalamu'alaikum / Halo ${client.nama},`,
      '',
      `Berikut adalah resume nutrisi Anda dari ${APP_DISPLAY_NAME}:`,
      '',
      `• Berat Badan: ${client.berat_badan != null ? formatNumberId(client.berat_badan) : '—'} kg`,
      `• Tinggi Badan: ${client.tinggi_badan != null ? formatNumberId(client.tinggi_badan) : '—'} cm`,
      `• BMI: ${bmi != null ? formatNumberId(bmi) : '—'} (${bmiCat.label})`,
      `• Kebutuhan Kalori Harian: ${energy != null ? formatNumberId(energy) : '—'} kkal`,
      '',
      'Saran dari Ahli Gizi:',
      notes.trim() || '—',
      '',
      'Salam hangat,',
      staff?.nama ?? 'Ahli Gizi',
    ]
    return lines.join('\n')
  }, [client, bmi, bmiCat.label, energy, notes, staff?.nama])

  function openWhatsApp() {
    if (!waDigits) return
    const url = `https://wa.me/${waDigits}?text=${encodeURIComponent(messageBody)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (isLoading || !client) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>
  }

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-3">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Nama</dt>
          <dd className="text-right font-medium">{client.nama}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Umur</dt>
          <dd className="tabular-nums">{age != null ? `${age} tahun` : '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Jenis kelamin</dt>
          <dd>{sexLabel(client.jenis_kelamin)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">BB / TB</dt>
          <dd className="text-right tabular-nums">
            {client.berat_badan != null ? formatNumberId(client.berat_badan) : '—'} kg ·{' '}
            {client.tinggi_badan != null ? formatNumberId(client.tinggi_badan) : '—'} cm
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">BMI</dt>
          <dd className="text-right tabular-nums">
            {bmi != null ? formatNumberId(bmi) : '—'} ({bmiCat.label})
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Kebutuhan energi</dt>
          <dd className="text-right tabular-nums">
            {energy != null ? `${formatNumberId(energy)} kkal` : '—'}
          </dd>
        </div>
      </dl>

      <Button type="button" variant="outline" className="w-full" onClick={toggleResume}>
        {resumeOpen ? 'Sembunyikan resume' : 'Generate resume'}
      </Button>

      {resumeOpen ? (
        <div className="rounded-xl border border-dashed border-primary/35 bg-primary/4 p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {messageBody}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="gizi-notes">Catatan ahli gizi</Label>
        <Textarea
          id="gizi-notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Rekomendasi untuk klien…"
          className="resize-none text-sm"
        />
      </div>

      {resumeOpen ? (
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-3">
          <div>
            <p className="text-xs font-medium text-foreground">Simpan sebagai evaluasi rutin</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tampil di halaman Progres klien. Catatan di atas disimpan sebagai catatan evaluasi.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eval-from" className={EVAL_LABEL}>
                Tanggal mulai
              </Label>
              <DatePicker
                id="eval-from"
                value={evalDateFrom}
                onChange={setEvalDateFrom}
                placeholder="Mulai"
                className="h-9 w-full justify-start font-normal"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eval-to" className={EVAL_LABEL}>
                Tanggal selesai
              </Label>
              <DatePicker
                id="eval-to"
                value={evalDateTo}
                onChange={setEvalDateTo}
                placeholder="Selesai"
                className="h-9 w-full justify-start font-normal"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resume-eval-exercise" className={EVAL_LABEL}>
                Frekuensi olahraga
              </Label>
              <Input
                id="resume-eval-exercise"
                value={exerciseFreq}
                onChange={(e) => setExerciseFreq(e.target.value)}
                placeholder="Contoh: 3x/minggu"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resume-eval-sleep" className={EVAL_LABEL}>
                Istirahat cukup
              </Label>
              <Select value={sleepEnough} onValueChange={setSleepEnough}>
                <SelectTrigger id="resume-eval-sleep" className="h-9">
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="yes">Ya</SelectItem>
                  <SelectItem value="no">Tidak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resume-eval-veg" className={EVAL_LABEL}>
                Konsumsi sayur (kali/hari)
              </Label>
              <Input
                id="resume-eval-veg"
                inputMode="numeric"
                value={vegTimesPerDay}
                onChange={(e) => setVegTimesPerDay(e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resume-eval-bmi" className={EVAL_LABEL}>
                BMI
              </Label>
              <Input
                id="resume-eval-bmi"
                inputMode="decimal"
                value={evalBmiStr}
                onChange={(e) => setEvalBmiStr(e.target.value)}
                placeholder="Contoh: 23.5"
                className="h-9"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={!evalRangeReady || saveEvaluation.isPending}
            onClick={() => saveEvaluation.mutate()}
          >
            {saveEvaluation.isPending ? 'Menyimpan…' : 'Simpan evaluasi'}
          </Button>
        </div>
      ) : null}

      <Button type="button" variant="secondary" className="w-full" disabled={!waDigits} onClick={openWhatsApp}>
        Kirim via WhatsApp
      </Button>
      {!waDigits ? (
        <p className="text-xs text-muted-foreground">
          Tambahkan nomor telepon di akun untuk mengaktifkan tombol ini.
        </p>
      ) : null}

      <Button variant="link" asChild className={cn('h-auto px-0 text-primary')}>
        <Link to={`${linkPrefix}/${clientId}`} className="inline-flex items-center gap-1">
          Buka halaman detail
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </Button>
    </div>
  )
}

export function ClientQuickSummaryModal({ open, onOpenChange, clientId, linkPrefix }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,640px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ringkasan klien</DialogTitle>
        </DialogHeader>

        {open && clientId ? (
          <ClientQuickSummaryBody key={clientId} clientId={clientId} linkPrefix={linkPrefix} />
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
