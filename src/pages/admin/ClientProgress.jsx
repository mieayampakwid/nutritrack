import { AppShell } from '@/components/layout/AppShell'
import { ClientDirectory } from '@/components/clients/ClientDirectory'

export function ClientProgress() {
  return (
    <AppShell>
      <ClientDirectory linkPrefix="/participants" title="Klien" />
    </AppShell>
  )
}
