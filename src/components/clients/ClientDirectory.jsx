import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { formatDateId, formatNumberId } from '@/lib/format'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function subDays(isoDate, n) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function ClientDirectory({ linkPrefix, title }) {
  const { data, isLoading } = useQuery({
    queryKey: ['client_directory'],
    queryFn: async () => {
      const { data: profiles, error: e1 } = await supabase
        .from('profiles')
        .select('id, nama, instalasi, role, is_active')
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

  const avgKal7 = {}
  for (const u of data?.profiles ?? []) avgKal7[u.id] = { sum: 0, n: 0 }
  for (const l of data?.logs ?? []) {
    if (!avgKal7[l.user_id]) continue
    avgKal7[l.user_id].sum += Number(l.total_kalori) || 0
    avgKal7[l.user_id].n += 1
  }

  return (
    <div className="space-y-4">
      {title && <h2 className="text-lg font-medium">{title}</h2>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data?.profiles ?? []).map((p) => {
          const lm = latestByUser[p.id]
          const ak = avgKal7[p.id]
          const avg =
            ak && ak.n > 0 ? ak.sum / ak.n : null
          return (
            <Link key={p.id} to={`${linkPrefix}/${p.id}`}>
              <Card
                className={cn(
                  'h-full transition-colors hover:bg-muted/40',
                  MOBILE_DASHBOARD_CARD_SHELL,
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{p.nama}</CardTitle>
                  <p className="text-sm text-muted-foreground">{p.instalasi ?? '—'}</p>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">BMI terakhir: </span>
                    {lm?.bmi != null ? (
                      <>
                        {formatNumberId(lm.bmi)} ({formatDateId(lm.tanggal)})
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Rata kalori 7 hari: </span>
                    {avg != null ? <KaloriValue value={avg} /> : '—'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
      {data?.profiles?.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada klien aktif.</p>
      )}
    </div>
  )
}
