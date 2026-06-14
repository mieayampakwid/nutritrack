import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, AlertCircle, AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useMyGroup } from '@/hooks/useMyGroup'
import { supabase } from '@/lib/supabase'
import { useMemo } from 'react'

export function GiziMyGroup() {
  const { data: group, isLoading, error } = useMyGroup()

  const memberIds = useMemo(
    () => (group?.members ?? []).map((m) => m.klien_id).filter(Boolean),
    [group],
  )

  const { data: riwayatMap = {} } = useQuery({
    queryKey: ['my_group_riwayat', memberIds],
    enabled: memberIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, riwayat_penyakit')
        .in('id', memberIds)
      if (error) throw error
      const map = {}
      for (const p of data ?? []) map[p.id] = p.riwayat_penyakit
      return map
    },
  })

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">Terjadi kesalahan</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {error.message ?? 'Gagal memuat data kelompok.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  if (!group) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-foreground">Belum ada kelompok</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Anda belum ditugaskan ke kelompok mana pun. Silakan hubungi admin untuk penugasan.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  const members = group.members ?? []

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{group.nama}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelompok klien yang Anda tangani
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {members.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Belum ada klien di kelompok ini.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {members.map((member) => {
                  const riwayat = riwayatMap[member.klien_id]
                  return (
                    <Link
                      key={member.id}
                      to={`/gizi/participants/${member.klien_id}`}
                      className="block hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 px-6 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{member.klien_nama}</p>
                          <p className="text-sm text-muted-foreground truncate">{member.klien_email}</p>
                          {riwayat ? (
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Riwayat Penyakit
                            </p>
                          ) : null}
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          Klien
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
