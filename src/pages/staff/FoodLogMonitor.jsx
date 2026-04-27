import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { ClipboardList, ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { FoodLogTable } from '@/components/food/FoodLogTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { formatDateId, toIsoDateLocal } from '@/lib/format'
import { compareIsoDates } from '@/lib/foodLogRange'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const STAFF_LOG_STALE_MS = 10 * 60 * 1000

/** Compact filter row: smaller type + shorter controls (scoped to this page). */
const FILTER_LABEL_CLASS = 'text-xs font-medium leading-snug sm:text-sm'
/** Klien + Jumlah hari: closed field ([&>span] = SelectValue); dropdown list stays normal. */
const FILTER_SELECT_TRIGGER_CLASS = cn(
  'h-8 min-h-0 w-full gap-1.5 px-2.5 py-1 md:h-8',
  '[&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0',
  '[&>span]:text-[13px] [&>span]:leading-snug',
)
const FILTER_SELECT_CONTENT_CLASS = 'max-h-72 text-sm'
const FILTER_SELECT_ITEM_CLASS = 'py-1.5 pl-2 pr-8 text-sm sm:py-1.5'
const FILTER_DATE_CLASS = cn(
  'h-8 min-h-0 w-full justify-start gap-1.5 rounded-md px-2.5 py-0 text-sm font-normal leading-tight md:h-8',
  '[&_svg]:mr-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0',
)

export function FoodLogMonitor() {
  const location = useLocation()
  const clientsBase = location.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'
  const { profile: staff } = useAuth()
  const qc = useQueryClient()

  const [userId, setUserId] = useState('')
  const [dateFromInput, setDateFromInput] = useState('')
  const [dateToInput, setDateToInput] = useState(() => toIsoDateLocal(new Date()))

  const [exerciseFreq, setExerciseFreq] = useState('')
  const [sleepEnough, setSleepEnough] = useState('')
  const [vegTimesPerDay, setVegTimesPerDay] = useState('')
  const [usageNotes, setUsageNotes] = useState('')
  const [bmi, setBmi] = useState('')

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['staff_food_log_clients'],
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
  const { data: logs = [], isLoading: loadingLogs } = useFoodLogsForUser(userId, {
    enabled: Boolean(userId) && rangeReady,
    dateFrom,
    dateTo,
    staleTime: STAFF_LOG_STALE_MS,
  })

  const selectedClient = clients.find((c) => c.id === userId)

  const saveEvaluation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Pilih klien terlebih dahulu.')
      if (!rangeReady) throw new Error('Tanggal mulai dan selesai wajib diisi.')

      const veg = vegTimesPerDay === '' ? null : Number(vegTimesPerDay)
      const bmiNum = bmi === '' ? null : Number(bmi)
      if (veg != null && (!Number.isFinite(veg) || veg < 0)) {
        throw new Error('Konsumsi sayur harus berupa angka >= 0.')
      }
      if (bmiNum != null && (!Number.isFinite(bmiNum) || bmiNum <= 0)) {
        throw new Error('BMI harus berupa angka > 0.')
      }

      const payload = {
        user_id: userId,
        date_from: dateFrom,
        date_to: dateTo,
        exercise_freq: exerciseFreq.trim() || null,
        sleep_enough: sleepEnough === '' ? null : sleepEnough === 'yes',
        veg_times_per_day: veg,
        usage_notes: usageNotes.trim() || null,
        bmi: bmiNum,
        created_by: staff?.id ?? null,
      }

      const { error } = await supabase.from('user_evaluations').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Evaluasi disimpan.')
      qc.invalidateQueries({ queryKey: ['user_evaluations', userId] })
      setExerciseFreq('')
      setSleepEnough('')
      setVegTimesPerDay('')
      setUsageNotes('')
      setBmi('')
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menyimpan evaluasi.')
      console.error(e)
    },
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5 md:space-y-6">
        <div
          className={cn(
            'max-md:rounded-2xl max-md:border max-md:border-border/80 max-md:bg-card max-md:p-4 max-md:shadow-sm max-md:ring-1 max-md:ring-black/[0.04]',
          )}
        >
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            <ClipboardList className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" aria-hidden />
            Pantau log makan
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-1.5">
            Pilih klien dan rentang tanggal untuk menganalisis entri makan tanpa memuat seluruh riwayat.
          </p>
        </div>

        <Card
          className={cn(
            'border-border/80 shadow-sm md:rounded-xl',
            MOBILE_DASHBOARD_CARD_SHELL,
          )}
        >
          <CardHeader className="border-b border-border/60 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Filter</CardTitle>
            <CardDescription className="text-xs leading-relaxed sm:text-sm">
              Pilih rentang tanggal untuk menganalisis entri makan tanpa memuat seluruh riwayat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2.5 sm:space-y-4 sm:pt-3">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="monitor-client" className={FILTER_LABEL_CLASS}>
                  Klien
                </Label>
                <Select
                  value={userId}
                  onValueChange={setUserId}
                  disabled={loadingClients}
                >
                  <SelectTrigger id="monitor-client" className={FILTER_SELECT_TRIGGER_CLASS}>
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
                <Label htmlFor="monitor-from" className={FILTER_LABEL_CLASS}>
                  Tanggal mulai
                </Label>
                <DatePicker
                  id="monitor-from"
                  value={dateFromInput}
                  onChange={setDateFromInput}
                  placeholder="Mulai"
                  className={FILTER_DATE_CLASS}
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="monitor-to" className={FILTER_LABEL_CLASS}>
                Tanggal selesai
              </Label>
              <DatePicker
                id="monitor-to"
                value={dateToInput}
                onChange={(v) => setDateToInput(v || toIsoDateLocal(new Date()))}
                placeholder="Selesai"
                className={FILTER_DATE_CLASS}
              />
            </div>

            {selectedClient && rangeReady ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {formatDateId(dateFrom)} — {formatDateId(dateTo)}
                </Badge>
              </div>
            ) : null}

            {userId && selectedClient ? (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to={`${clientsBase}?client=${encodeURIComponent(userId)}`}>
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Buka daftar klien (baris ini)
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className={cn('border-border/80 shadow-sm md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
          <CardHeader className="border-b border-border/60 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Evaluasi rutin</CardTitle>
            <CardDescription className="text-xs leading-relaxed sm:text-sm">
              Untuk admin & ahli gizi. Evaluasi ini akan tampil di halaman progres klien.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-3">
            {!userId ? (
              <p className="text-sm text-muted-foreground">Pilih klien terlebih dahulu.</p>
            ) : !rangeReady ? (
              <p className="text-sm text-muted-foreground">Lengkapi tanggal mulai dan selesai.</p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  saveEvaluation.mutate()
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="eval-exercise" className={FILTER_LABEL_CLASS}>
                      Frekuensi olahraga
                    </Label>
                    <Input
                      id="eval-exercise"
                      value={exerciseFreq}
                      onChange={(e) => setExerciseFreq(e.target.value)}
                      placeholder="Contoh: 3x/minggu"
                      className="h-10 md:h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="eval-sleep" className={FILTER_LABEL_CLASS}>
                      Istirahat cukup
                    </Label>
                    <Select value={sleepEnough} onValueChange={setSleepEnough}>
                      <SelectTrigger id="eval-sleep" className="h-10 md:h-9">
                        <SelectValue placeholder="Pilih" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="yes">Ya</SelectItem>
                        <SelectItem value="no">Tidak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="eval-veg" className={FILTER_LABEL_CLASS}>
                      Konsumsi sayur (kali/hari)
                    </Label>
                    <Input
                      id="eval-veg"
                      inputMode="numeric"
                      value={vegTimesPerDay}
                      onChange={(e) => setVegTimesPerDay(e.target.value)}
                      placeholder="0"
                      className="h-10 md:h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="eval-bmi" className={FILTER_LABEL_CLASS}>
                      BMI
                    </Label>
                    <Input
                      id="eval-bmi"
                      inputMode="decimal"
                      value={bmi}
                      onChange={(e) => setBmi(e.target.value)}
                      placeholder="Contoh: 23.5"
                      className="h-10 md:h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="eval-notes" className={FILTER_LABEL_CLASS}>
                    Catatan Konsumsi Pemakaian
                  </Label>
                  <Textarea
                    id="eval-notes"
                    rows={3}
                    value={usageNotes}
                    onChange={(e) => setUsageNotes(e.target.value)}
                    placeholder="Catatan evaluasi…"
                  />
                </div>

                <Button type="submit" size="sm" disabled={!userId || !rangeReady}>
                  {saveEvaluation.isPending ? 'Menyimpan…' : 'Simpan evaluasi'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Separator className="opacity-60" />

        <section aria-label="Tabel log makan">
          {!userId ? (
            <p
              className={cn(
                'rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm',
                'md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-6 md:shadow-none',
              )}
            >
              Pilih klien untuk menampilkan log.
            </p>
          ) : !rangeReady ? (
            <p
              className={cn(
                'rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm',
                'md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-6 md:shadow-none',
              )}
            >
              Lengkapi tanggal mulai dan selesai untuk mode kustom.
            </p>
          ) : loadingLogs ? (
            <div
              className={cn(
                'rounded-2xl border border-border bg-card px-4 py-12 shadow-sm md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-8 md:shadow-none',
              )}
            >
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
