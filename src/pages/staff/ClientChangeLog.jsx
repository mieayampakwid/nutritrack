import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAnthropometricChangeLog } from '@/hooks/useAnthropometricChangeLog'
import { anthropometricFieldLabel } from '@/lib/anthropometricChangeLogLabels'
import { formatDateId, formatNumberId } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

const SOURCE_LABELS = {
  body_measurements: 'Pengukuran',
  assessments: 'Asesmen energi',
  profiles: 'Profil (BB/TB)',
}

function formatLogValue(field, raw) {
  if (raw == null || raw === '') return '—'
  if (field === 'energi_total') {
    const n = Number(raw)
    return Number.isFinite(n) ? `${formatNumberId(n)} kkal` : raw
  }
  const n = Number(raw)
  if (Number.isFinite(n)) return formatNumberId(n)
  return raw
}

export function ClientChangeLog() {
  const { id } = useParams()
  const location = useLocation()
  const listPath = location.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'
  const profilePath = `${listPath}/${id}`

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['profile', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
  })

  const { data: rows = [], isLoading: loadingLog } = useAnthropometricChangeLog(id, Boolean(id))

  if (loadingClient || !id) {
    return (
      <AppShell>
        <LoadingSpinner />
      </AppShell>
    )
  }

  if (!client || client.role !== 'klien') {
    return (
      <AppShell>
        <p className="text-muted-foreground">Klien tidak ditemukan.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to={listPath}>Kembali</Link>
        </Button>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to={profilePath}>
            <ArrowLeft className="h-4 w-4" />
            Kembali ke profil
          </Link>
        </Button>
      </div>

      <Card className={cn('md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Riwayat perubahan antropometri &amp; energi</CardTitle>
          <p className="text-sm text-muted-foreground">{client.nama}</p>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLog ? (
            <div className="p-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead className="text-right">Nilai lama</TableHead>
                    <TableHead className="text-right">Nilai baru</TableHead>
                    <TableHead>Sumber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.changed_at
                          ? formatDateId(String(r.changed_at).slice(0, 10))
                          : '—'}
                        <span className="ml-1 text-muted-foreground">
                          {r.changed_at
                            ? new Date(r.changed_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {anthropometricFieldLabel(r.field)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatLogValue(r.field, r.old_value)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatLogValue(r.field, r.new_value)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {SOURCE_LABELS[r.source] ?? r.source}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Belum ada perubahan tercatat.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}
