import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateId } from '@/lib/format'
import { useExerciseLogsForUser } from '@/hooks/useExerciseLog'
import { KLIEN_DASHBOARD_LOG_CARD_SHELL } from '@/lib/pageCard'

export function ExerciseLogHistoryCard({ userId, tanggal }) {
  const { data: logs = [], isLoading } = useExerciseLogsForUser(userId, {
    enabled: Boolean(userId),
    dateFrom: tanggal,
    dateTo: tanggal,
  })

  const rows = useMemo(() => logs ?? [], [logs])

  return (
    <Card className={KLIEN_DASHBOARD_LOG_CARD_SHELL}>
      <CardHeader className="space-y-0 p-0 px-3 pb-2 pt-2 sm:px-4 sm:pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold tracking-tight text-neutral-900">
              Log olahraga
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Tanggal {formatDateId(tanggal)}.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
        {isLoading ? (
          <div className="space-y-2.5 py-1">
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted/70" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-background/60 p-4 text-center shadow-sm">
            <p className="text-sm font-medium text-foreground">Belum ada log olahraga.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Kalau kamu mulai catat aktivitas di halaman food entry, lognya akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Jenis Olahraga</TableHead>
                  <TableHead>Durasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap align-top tabular-nums text-muted-foreground">
                      #{idx + 1}
                    </TableCell>
                    <TableCell className="min-w-48 align-top text-sm">
                      {r.jenis_olahraga || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-top text-sm">
                      {r.durasi || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

