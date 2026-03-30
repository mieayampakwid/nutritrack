import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { ClipboardList, ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import { FoodLogTable } from '@/components/food/FoodLogTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { formatDateId, toIsoDateLocal } from '@/lib/format'
import { compareIsoDates, inclusiveRangeEndingAt } from '@/lib/foodLogRange'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const PRESETS = [
  { value: '7', label: '7 hari' },
  { value: '10', label: '10 hari' },
  { value: '14', label: '14 hari' },
  { value: '30', label: '30 hari' },
  { value: 'custom', label: 'Kustom (pilih tanggal)' },
]

const STAFF_LOG_STALE_MS = 10 * 60 * 1000

/** Compact filter row: smaller type + shorter controls (scoped to this page). */
const FILTER_LABEL_CLASS = 'text-xs font-medium leading-snug sm:text-sm'
/** Klien + Jumlah hari selects: smallest trigger text, tight line-height. */
const FILTER_SELECT_TRIGGER_CLASS = cn(
  'h-7 min-h-0 w-full gap-1 px-2 py-0.5 text-xs leading-none md:h-7',
  '[&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0',
)
const FILTER_SELECT_CONTENT_CLASS = 'max-h-72 text-xs'
const FILTER_SELECT_ITEM_CLASS = 'py-1 pl-2 pr-8 text-xs leading-tight sm:py-1'
const FILTER_DATE_CLASS = cn(
  'h-8 min-h-0 w-full justify-start gap-1.5 rounded-md px-2.5 py-0 text-sm font-normal leading-tight md:h-8',
  '[&_svg]:mr-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0',
)

export function FoodLogMonitor() {
  const location = useLocation()
  const clientsBase = location.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'

  const [userId, setUserId] = useState('')
  const [endDate, setEndDate] = useState(() => toIsoDateLocal(new Date()))
  const [preset, setPreset] = useState('10')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState(() => toIsoDateLocal(new Date()))

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
    if (preset === 'custom') {
      let a = customFrom
      let b = customTo
      if (a && b && compareIsoDates(a, b) > 0) {
        ;[a, b] = [b, a]
      }
      return { dateFrom: a, dateTo: b }
    }
    const n = Number(preset)
    if (!endDate || Number.isNaN(n)) return { dateFrom: '', dateTo: '' }
    return inclusiveRangeEndingAt(endDate, n)
  }, [preset, endDate, customFrom, customTo])

  const rangeReady = Boolean(dateFrom && dateTo)
  const { data: logs = [], isLoading: loadingLogs } = useFoodLogsForUser(userId, {
    enabled: Boolean(userId) && rangeReady,
    dateFrom,
    dateTo,
    staleTime: STAFF_LOG_STALE_MS,
  })

  const selectedClient = clients.find((c) => c.id === userId)

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
              Rentang dihitung inklusif. Preset seperti &quot;10 hari&quot; berarti 10 hari kalender
              diakhiri pada tanggal &quot;Sampai tanggal&quot; — cocok untuk tinjauan berkala.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 sm:space-y-4 sm:pt-6">
            <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1">
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

              <div className="space-y-1">
                <Label htmlFor="monitor-preset" className={FILTER_LABEL_CLASS}>
                  Jumlah hari
                </Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger id="monitor-preset" className={FILTER_SELECT_TRIGGER_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className={FILTER_SELECT_CONTENT_CLASS}>
                    {PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value} className={FILTER_SELECT_ITEM_CLASS}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {preset !== 'custom' ? (
              <div className="space-y-1.5 sm:max-w-xs">
                <Label htmlFor="monitor-end" className={FILTER_LABEL_CLASS}>
                  Sampai tanggal
                </Label>
                <DatePicker
                  id="monitor-end"
                  value={endDate}
                  onChange={(v) => setEndDate(v || toIsoDateLocal(new Date()))}
                  placeholder="Tanggal akhir rentang"
                  className={FILTER_DATE_CLASS}
                />
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="monitor-from" className={FILTER_LABEL_CLASS}>
                    Tanggal mulai
                  </Label>
                  <DatePicker
                    id="monitor-from"
                    value={customFrom}
                    onChange={setCustomFrom}
                    placeholder="Mulai"
                    className={FILTER_DATE_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monitor-to" className={FILTER_LABEL_CLASS}>
                    Tanggal selesai
                  </Label>
                  <DatePicker
                    id="monitor-to"
                    value={customTo}
                    onChange={setCustomTo}
                    placeholder="Selesai"
                    className={FILTER_DATE_CLASS}
                  />
                </div>
              </div>
            )}

            {selectedClient && rangeReady ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {formatDateId(dateFrom)} — {formatDateId(dateTo)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {preset === 'custom' ? 'Rentang kustom' : `${preset} hari kalender`}
                </span>
              </div>
            ) : null}

            {userId && selectedClient ? (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to={`${clientsBase}/${userId}`}>
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Buka profil & antropometri
                </Link>
              </Button>
            ) : null}
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
