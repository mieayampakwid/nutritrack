import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

export function ClientDataEntryPicker() {
  const location = useLocation()
  const clientsBase = location.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['client_data_entry_picker'],
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

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-white">
            Entri data klien
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-white/85">
            Pilih klien untuk mengisi BMI dan asesmen Harris–Benedict (kartu A &amp; B).
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : clients.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Belum ada klien aktif.
          </p>
        ) : (
          <ul className="space-y-2">
            {clients.map((c) => (
              <li key={c.id}>
                <Card
                  className={cn(
                    'overflow-hidden transition-colors hover:bg-muted/30',
                    MOBILE_DASHBOARD_CARD_SHELL,
                  )}
                >
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{c.nama}</p>
                      <p className="text-sm text-muted-foreground">{c.instalasi ?? '—'}</p>
                    </div>
                    <Button asChild size="sm" className="shrink-0 gap-1">
                      <Link to={`${clientsBase}/${c.id}/data-entry`}>
                        Buka entri
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
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
