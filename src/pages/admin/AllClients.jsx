import { AppShell } from '@/components/layout/AppShell'
import { ClientDirectory } from '@/components/clients/ClientDirectory'

export function AllClients() {
  return (
    <AppShell>
      <ClientDirectory linkPrefix="/admin/clients" title="Semua klien" />
    </AppShell>
  )
}

