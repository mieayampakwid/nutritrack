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
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            <ClipboardList className="h-6 w-6 text-primary" aria-hidden />
            Pantau log makan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih klien dan rentang tanggal untuk menganalisis entri makan tanpa memuat seluruh riwayat.
          </p>
        </div>

        <Card
          className={cn(
            'border-border/80 shadow-sm md:rounded-xl',
            MOBILE_DASHBOARD_CARD_SHELL,
          )}
        >
          <CardHeader className="border-b border-border/60 py-4">
            <CardTitle className="text-base">Filter</CardTitle>
            <CardDescription>
              Rentang dihitung inklusif. Preset seperti &quot;10 hari&quot; berarti 10 hari kalender
              diakhiri pada tanggal &quot;Sampai tanggal&quot; — cocok untuk tinjauan berkala.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monitor-client">Klien</Label>
                <Select
                  value={userId}
                  onValueChange={setUserId}
                  disabled={loadingClients}
                >
                  <SelectTrigger id="monitor-client" className="w-full">
                    <SelectValue placeholder={loadingClients ? 'Memuat…' : 'Pilih klien'} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-72">
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.instalasi ? `${c.nama} — ${c.instalasi}` : c.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monitor-preset">Jumlah hari</Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger id="monitor-preset" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {preset !== 'custom' ? (
              <div className="space-y-2 sm:max-w-xs">
                <Label htmlFor="monitor-end">Sampai tanggal</Label>
                <DatePicker
                  id="monitor-end"
                  value={endDate}
                  onChange={(v) => setEndDate(v || toIsoDateLocal(new Date()))}
                  placeholder="Tanggal akhir rentang"
                />
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monitor-from">Tanggal mulai</Label>
                  <DatePicker
                    id="monitor-from"
                    value={customFrom}
                    onChange={setCustomFrom}
                    placeholder="Mulai"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monitor-to">Tanggal selesai</Label>
                  <DatePicker
                    id="monitor-to"
                    value={customTo}
                    onChange={setCustomTo}
                    placeholder="Selesai"
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
            <p className="text-center text-sm text-muted-foreground">Pilih klien untuk menampilkan log.</p>
          ) : !rangeReady ? (
            <p className="text-center text-sm text-muted-foreground">
              Lengkapi tanggal mulai dan selesai untuk mode kustom.
            </p>
          ) : loadingLogs ? (
            <LoadingSpinner />
          ) : (
            <FoodLogTable logs={logs} pageSize={10} />
          )}
        </section>
      </div>
    </AppShell>
  )
}
