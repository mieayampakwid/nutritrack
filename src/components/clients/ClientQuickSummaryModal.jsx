import { useQuery } from '@tanstack/react-query'
import { differenceInYears } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { calculateBMI, getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
import { APP_DISPLAY_NAME } from '@/lib/appMeta'
import { formatNumberId, parseIsoDateLocal } from '@/lib/format'
import { normalizeIndonesiaWhatsAppDigits } from '@/lib/whatsappPhone'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function sexLabel(v) {
  if (v === 'male') return 'Laki-laki'
  if (v === 'female') return 'Perempuan'
  return '—'
}

function ClientQuickSummaryBody({ clientId, linkPrefix }) {
  const { profile: staff } = useAuth()
  const [resumeOpen, setResumeOpen] = useState(false)
  const [notes, setNotes] = useState('')

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

  const waDigits = normalizeIndonesiaWhatsAppDigits(client?.phone_whatsapp) ?? normalizeIndonesiaWhatsAppDigits(client?.nomor_wa)

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

      <Button type="button" variant="outline" className="w-full" onClick={() => setResumeOpen((v) => !v)}>
        {resumeOpen ? 'Sembunyikan resume' : 'Generate resume'}
      </Button>

      {resumeOpen ? (
        <div className="rounded-xl border border-dashed border-primary/35 bg-primary/[0.04] p-3 text-xs leading-relaxed whitespace-pre-wrap">
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

      <Button type="button" variant="secondary" className="w-full" disabled={!waDigits} onClick={openWhatsApp}>
        Kirim via WhatsApp
      </Button>
      {!waDigits ? (
        <p className="text-xs text-muted-foreground">
          Tambahkan nomor WhatsApp (profil: phone_whatsapp atau nomor_wa) untuk mengaktifkan tombol ini.
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
