import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarRange } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FoodLogTable } from '@/components/food/FoodLogTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { useMeasurements } from '@/hooks/useMeasurement'
import { inclusiveDaysBetweenIso, isAtLeastEvaluationDays } from '@/lib/evaluationRange'
import { formatDateId, formatNumberId, toIsoDateLocal } from '@/lib/format'
import { compareIsoDates } from '@/lib/foodLogRange'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { logError } from '@/lib/logger'

const STAFF_LOG_STALE_MS = 10 * 60 * 1000

const FILTER_LABEL_CLASS = 'text-xs font-medium leading-snug sm:text-sm'
const FILTER_SELECT_TRIGGER_CLASS = cn(
  'h-8 min-h-0 w-full gap-1.5 px-2.5 py-1 md:h-8',
  '[&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0',
  '[&>span]:text-xs [&>span]:leading-tight',
)
const FILTER_SELECT_CONTENT_CLASS = 'max-h-72 text-sm'
const FILTER_SELECT_ITEM_CLASS = 'py-1.5 pl-2 pr-8 text-sm sm:py-1.5'
const FILTER_DATE_CLASS = cn(
  'h-8 min-h-0 w-full justify-start gap-1.5 rounded-md px-2.5 py-0 text-sm font-normal leading-tight md:h-8',
  '[&_svg]:mr-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0',
)

export function ParticipantEvaluation() {
  const location = useLocation()
  const clientsBase = location.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'
  const { profile: staff } = useAuth()
  const qc = useQueryClient()

  const [userId, setUserId] = useState('')
  const [dateFromInput, setDateFromInput] = useState('')
  const [dateToInput, setDateToInput] = useState(() => toIsoDateLocal(new Date()))
  const [recommendations, setRecommendations] = useState('')

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['staff_evaluation_clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, instalasi')
        .eq('role', 'klien')
        .eq('is_active', true)
        .order('nama')
      if (error) throw error
      return data ?? []
    },
  })

  const { dateFrom, dateTo } = useMemo(() => {
    let a = dateFromInput
    let b = dateToInput
    if (a && b && compareIsoDates(a, b) > 0) {
      ;[a, b] = [b, a]
    }
    return { dateFrom: a, dateTo: b }
  }, [dateFromInput, dateToInput])

  const rangeReady = Boolean(dateFrom && dateTo)
  const rangeValid = rangeReady && isAtLeastEvaluationDays(dateFrom, dateTo)
  const inclusiveDays = rangeReady ? inclusiveDaysBetweenIso(dateFrom, dateTo) : null

  const { data: logs = [], isLoading: loadingLogs } = useFoodLogsForUser(userId, {
    enabled: Boolean(userId) && rangeReady && rangeValid,
    dateFrom,
    dateTo,
    staleTime: STAFF_LOG_STALE_MS,
  })

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error) throw error
      return data
    },
  })

  const { data: measurements = [], isLoading: loadingM } = useMeasurements(userId, Boolean(userId))

  const latestMeasurement = useMemo(() => {
    if (!measurements.length) return null
    return [...measurements].sort((a, b) => {
      const c = b.tanggal.localeCompare(a.tanggal)
      if (c !== 0) return c
      return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
    })[0]
  }, [measurements])

  const selectedClient = clients.find((c) => c.id === userId)

  const saveEvaluation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Pilih klien terlebih dahulu.')
      if (!rangeReady) throw new Error('Tanggal mulai dan selesai wajib diisi.')
      if (!isAtLeastEvaluationDays(dateFrom, dateTo)) {
        throw new Error('Rentang evaluasi minimal 14 hari (inklusif).')
      }
      const rec = recommendations.trim()
      if (!rec) throw new Error('Isi rekomendasi sebelum menyimpan.')

      const { error } = await supabase.from('user_evaluations').insert({
        user_id: userId,
        date_from: dateFrom,
        date_to: dateTo,
        recommendations: rec,
        created_by: staff?.id ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Evaluasi dan rekomendasi disimpan.')
      qc.invalidateQueries({ queryKey: ['user_evaluations', userId] })
      setRecommendations('')
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menyimpan.')
      logError('ParticipantEvaluation.save', e)
    },
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5 md:space-y-6">
        <div
          className={cn(
            'max-md:rounded-2xl max-md:border max-md:border-border/80 max-md:bg-card max-md:p-4 max-md:shadow-sm max-md:ring-1 max-md:ring-black/4',
          )}
        >
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-white">
            <CalendarRange className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" aria-hidden />
            Evaluasi peserta
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-1.5 md:text-white/85">
            Pilih klien dan rentang minimal 14 hari. Tinjau log makan, data antropometri terbaru, dan simpan
            rekomendasi untuk periode tersebut.
          </p>
        </div>

        <Card className={cn('border-border/80 shadow-sm md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
          <CardHeader className="border-b border-border/60 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Filter</CardTitle>
            <CardDescription className="text-xs leading-relaxed sm:text-sm">
              Rentang tanggal harus mencakup minimal 14 hari kalender (inklusif).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2.5 sm:space-y-4 sm:pt-3">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eval-client" className={FILTER_LABEL_CLASS}>
                  Klien
                </Label>
                <Select value={userId} onValueChange={setUserId} disabled={loadingClients}>
                  <SelectTrigger id="eval-client" className={FILTER_SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder={loadingClients ? 'Memuat…' : 'Pilih klien'} />
                  </SelectTrigger>
                  <SelectContent position="popper" className={FILTER_SELECT_CONTENT_CLASS}>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id} className={FILTER_SELECT_ITEM_CLASS}>
                        {c.instalasi ? `${c.nama} — ${c.instalasi}` : c.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eval-from" className={FILTER_LABEL_CLASS}>
                  Tanggal mulai
                </Label>
                <DatePicker
                  id="eval-from"
                  value={dateFromInput}
                  onChange={setDateFromInput}
                  placeholder="Mulai"
                  className={FILTER_DATE_CLASS}
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="eval-to" className={FILTER_LABEL_CLASS}>
                Tanggal selesai
              </Label>
              <DatePicker
                id="eval-to"
                value={dateToInput}
                onChange={(v) => setDateToInput(v || toIsoDateLocal(new Date()))}
                placeholder="Selesai"
                className={FILTER_DATE_CLASS}
              />
            </div>
            {rangeReady && inclusiveDays != null ? (
              <p
                className={cn(
                  'text-sm',
                  rangeValid ? 'text-muted-foreground' : 'font-medium text-destructive',
                )}
              >
                Durasi terpilih: {inclusiveDays} hari
                {!rangeValid ? ' — minimal 14 hari diperlukan.' : null}
              </p>
            ) : null}
            {userId && selectedClient ? (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to={`${clientsBase}/${userId}`}>Buka profil klien</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {userId && loadingClient ? (
          <LoadingSpinner />
        ) : userId && client ? (
          <Card className={cn('border-border/80 shadow-sm md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">Data klien</CardTitle>
              <CardDescription>
                {client.nama}
                {client.instalasi ? ` · ${client.instalasi}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{client.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Periode evaluasi</p>
                <p className="font-medium tabular-nums">
                  {formatDateId(dateFrom)} — {formatDateId(dateTo)}
                </p>
              </div>
              {client?.riwayat_penyakit ? (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">Riwayat penyakit</p>
                  <p className="mt-0.5 whitespace-pre-wrap font-medium text-amber-700">
                    {client.riwayat_penyakit}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {userId ? (
          <Card className={cn('border-border/80 shadow-sm md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">Antropometri terbaru</CardTitle>
              <CardDescription>
                Pengukuran terakhir berdasarkan tanggal entri (bukan filter periode di atas).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingM ? (
                <LoadingSpinner />
              ) : latestMeasurement ? (
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="text-muted-foreground">Tanggal</dt>
                    <dd className="font-medium tabular-nums">{formatDateId(latestMeasurement.tanggal)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="text-muted-foreground">BB / TB</dt>
                    <dd className="font-medium tabular-nums">
                      {formatNumberId(latestMeasurement.berat_badan)} kg ·{' '}
                      {formatNumberId(latestMeasurement.tinggi_badan)} cm
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="text-muted-foreground">BMI</dt>
                    <dd className="font-medium tabular-nums">{formatNumberId(latestMeasurement.bmi)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="text-muted-foreground">Massa otot / lemak</dt>
                    <dd className="font-medium tabular-nums">
                      {formatNumberId(latestMeasurement.massa_otot)} kg ·{' '}
                      {formatNumberId(latestMeasurement.massa_lemak)} %
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:col-span-2 sm:block">
                    <dt className="text-muted-foreground">Lingkar pinggang</dt>
                    <dd className="font-medium tabular-nums">
                      {latestMeasurement.lingkar_pinggang != null
                        ? `${formatNumberId(latestMeasurement.lingkar_pinggang)} cm`
                        : '—'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada pengukuran.</p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {userId && rangeValid ? (
          <Card className={cn('border-border/80 shadow-sm md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">Rekomendasi</CardTitle>
              <CardDescription>
                Disimpan dengan stempel waktu dan terikat pada rentang tanggal evaluasi di atas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                rows={5}
                placeholder="Tuliskan rekomendasi diet / tindak lanjut…"
                className="min-h-[120px]"
              />
              <Button
                type="button"
                size="sm"
                disabled={saveEvaluation.isPending || !recommendations.trim()}
                onClick={() => saveEvaluation.mutate()}
              >
                {saveEvaluation.isPending ? 'Menyimpan…' : 'Simpan evaluasi'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <section aria-label="Log makan dalam periode">
          {!userId ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground md:rounded-none md:border-0 md:px-0">
              Pilih klien untuk menampilkan log.
            </p>
          ) : !rangeReady ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground md:rounded-none md:border-0 md:px-0">
              Lengkapi tanggal mulai dan selesai.
            </p>
          ) : !rangeValid ? (
            <p className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-10 text-center text-sm text-destructive md:rounded-none md:border-0 md:bg-transparent md:px-0">
              Perpanjang rentang tanggal menjadi minimal 14 hari agar log makan dan ringkasan evaluasi dapat
              ditampilkan.
            </p>
          ) : loadingLogs ? (
            <div className="py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <FoodLogTable logs={logs} pageSize={10} />
          )}
        </section>
      </div>
    </AppShell>
  )
}
