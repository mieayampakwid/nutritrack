import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ChevronRight, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { formatDateId, formatDisplayName, formatNumberId } from '@/lib/format'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { getInitials } from '@/lib/profileDisplay'
import { supabase } from '@/lib/supabase'
import { getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
import { latestActivityDate } from '@/lib/latestActivity'
import { cn } from '@/lib/utils'
import { ClientQuickSummaryModal } from '@/components/clients/ClientQuickSummaryModal'
import { useNavigate } from 'react-router-dom'

function subDays(isoDate, n) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function ClientDirectory({ linkPrefix, title }) {
  const navigate = useNavigate()
  const [summaryId, setSummaryId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['client_directory'],
    queryFn: async () => {
      const { data: profiles, error: e1 } = await supabase
        .from('profiles')
        .select('id, nama, instalasi, role, is_active, riwayat_penyakit')
        .eq('role', 'klien')
        .eq('is_active', true)
      if (e1) throw e1

      const ids = (profiles ?? []).map((p) => p.id)
      if (!ids.length) return { profiles: [], measurements: [], logs: [] }

      const { data: measurements, error: e2 } = await supabase
        .from('body_measurements')
        .select('*')
        .in('user_id', ids)
        .order('tanggal', { ascending: false })
      if (e2) throw e2

      const since = subDays(new Date().toISOString().slice(0, 10), 7)
      const { data: logs, error: e3 } = await supabase
        .from('food_logs')
        .select('user_id, tanggal, total_kalori')
        .in('user_id', ids)
        .gte('tanggal', since)
      if (e3) throw e3

      return { profiles: profiles ?? [], measurements: measurements ?? [], logs: logs ?? [] }
    },
  })

  if (isLoading) return <LoadingSpinner />

  const latestByUser = {}
  for (const m of data?.measurements ?? []) {
    if (!latestByUser[m.user_id]) latestByUser[m.user_id] = m
  }

  const latestLogByUser = {}
  for (const l of data?.logs ?? []) {
    const cur = latestLogByUser[l.user_id]
    if (!cur || String(l.tanggal) > String(cur.tanggal)) latestLogByUser[l.user_id] = l
  }

  const avgKal7 = {}
  for (const u of data?.profiles ?? []) avgKal7[u.id] = { sum: 0, n: 0 }
  for (const l of data?.logs ?? []) {
    if (!avgKal7[l.user_id]) continue
    avgKal7[l.user_id].sum += Number(l.total_kalori) || 0
    avgKal7[l.user_id].n += 1
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 md:space-y-7">
      {title ? (
        <div className="max-md:px-0.5 max-md:pb-1">
          <h1 className="text-xl font-semibold tracking-tight text-white max-md:drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] sm:text-2xl md:text-white md:drop-shadow-none">
            {title}
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/90 max-md:drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] sm:text-[0.9375rem] md:mt-2 md:text-white/85 md:drop-shadow-none">
            Ringkasan antropometri dan asupan kalori terbaru. Ketuk kartu untuk detail.
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {(data?.profiles ?? []).map((p) => {
          const lm = latestByUser[p.id]
          const ak = avgKal7[p.id]
          const avg =
            ak && ak.n > 0 ? ak.sum / ak.n : null
          const ll = latestLogByUser[p.id]
          const lastActivityDate = latestActivityDate(lm?.tanggal, ll?.tanggal)
          const lastActivityLabel = lastActivityDate ? formatDateId(lastActivityDate) : '—'
          const bmiCat = getBMICategoryAsiaPacific(lm?.bmi)
          const displayName = formatDisplayName(p.nama) || p.nama?.trim() || 'Klien'
          return (
            <button
              key={p.id}
              type="button"
              aria-label={`Buka profil ${displayName}`}
              className="block h-full w-full cursor-pointer rounded-[inherit] text-left outline-none transition-transform active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => navigate(`${linkPrefix}/${p.id}`)}
            >
              <Card
                className={cn(
                  'h-full transition-[colors,box-shadow] hover:bg-muted/35 hover:shadow-md',
                  MOBILE_DASHBOARD_CARD_SHELL,
                )}
              >
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3 pt-3 sm:gap-3.5 sm:pb-4 sm:pt-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
                    aria-hidden
                  >
                    {getInitials(p.nama)}
                  </div>
                  <div className="min-w-0 flex-1 pr-1">
                    <h3 className="truncate text-lg font-semibold leading-snug tracking-tight text-card-foreground sm:text-xl">
                      {displayName}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{p.instalasi ?? '—'}</p>
                    {p.riwayat_penyakit ? (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Ada riwayat penyakit
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight
                    className="mt-1 h-5 w-5 shrink-0 text-muted-foreground/70"
                    aria-hidden
                  />
                </CardHeader>
                <CardContent className="space-y-2 pb-4 text-sm leading-relaxed sm:pb-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">Aktivitas terakhir: </span>
                      <span className="font-semibold tabular-nums text-foreground">{lastActivityLabel}</span>
                    </p>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSummaryId(p.id)
                      }}
                    >
                      Ringkasan
                    </button>
                  </div>
                  <p>
                    <span className="text-muted-foreground">BMI terakhir: </span>
                    {lm?.bmi != null ? (
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatNumberId(lm.bmi)}{' '}
                        <span className="font-normal text-muted-foreground">({formatDateId(lm.tanggal)})</span>
                      </span>
                    ) : (
                      <span className="font-medium text-muted-foreground">—</span>
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Status BMI: </span>
                    <Badge variant="secondary" className="px-2 py-0.5 text-[11px] font-medium">
                      {bmiCat.label}
                    </Badge>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Rata kalori 7 hari: </span>
                    {avg != null ? (
                      <KaloriValue value={avg} className="font-semibold text-foreground" />
                    ) : (
                      <span className="font-medium text-muted-foreground">—</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
      {(data?.profiles?.length ?? 0) > 0 ? (
        <p className="pb-2 text-center text-xs text-muted-foreground/80 md:text-sm">Akhir daftar klien</p>
      ) : null}
      {data?.profiles?.length === 0 && (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada klien aktif.
        </p>
      )}

      <ClientQuickSummaryModal
        open={Boolean(summaryId)}
        onOpenChange={(o) => !o && setSummaryId(null)}
        clientId={summaryId}
        linkPrefix={linkPrefix}
      />
    </div>
  )
}
