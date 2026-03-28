import { AppShell } from '@/components/layout/AppShell'
import { ClientDirectory } from '@/components/clients/ClientDirectory'

export function ClientList() {
  return (
    <AppShell>
      <ClientDirectory linkPrefix="/gizi/clients" />
    </AppShell>
  )
}
