import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { formatDisplayName } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * @param {{ title: string; description: string; buildHref: (clientId: string) => string; actionLabel?: string }} props
 */
export function StaffClientPicker({ title, description, buildHref, actionLabel = 'Buka' }) {
  const location = useLocation()
  const [q, setQ] = useState('')
  const clientsBase = location.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'

  const { data: clients = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['staff_client_picker'],
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

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return clients
    return clients.filter((c) => {
      const name = String(c.nama ?? '').toLowerCase()
      const inst = String(c.instalasi ?? '').toLowerCase()
      return name.includes(t) || inst.includes(t)
    })
  }, [clients, q])

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau instalasi…"
            className="pl-9"
            aria-label="Cari klien"
          />
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-6 text-center text-sm">
            <p className="text-destructive">Gagal memuat daftar klien.</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Coba lagi
            </Button>
          </div>
        ) : clients.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Belum ada klien aktif.
          </p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Tidak ada klien yang cocok dengan pencarian.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => (
              <li key={c.id}>
                <Card
                  className={cn(
                    'overflow-hidden transition-colors hover:bg-muted/30',
                    MOBILE_DASHBOARD_CARD_SHELL,
                  )}
                >
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{formatDisplayName(c.nama)}</p>
                      <p className="text-sm text-muted-foreground">{c.instalasi ?? '—'}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`${clientsBase}/${c.id}`}>Detail</Link>
                      </Button>
                      <Button asChild size="sm" className="gap-1">
                        <Link to={buildHref(c.id)}>
                          {actionLabel}
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
