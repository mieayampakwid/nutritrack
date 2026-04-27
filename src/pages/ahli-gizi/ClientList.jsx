import { AppShell } from '@/components/layout/AppShell'
import { UnifiedClientList } from '@/components/clients/UnifiedClientList'

export function ClientList() {
  return (
    <AppShell>
      <UnifiedClientList linkPrefix="/gizi/clients" staffBase="/gizi" isAdmin={false} />
    </AppShell>
  )
}
