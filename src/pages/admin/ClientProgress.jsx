import { useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { UnifiedClientList } from '@/components/clients/UnifiedClientList'
import { AdminUserDetail } from '@/pages/admin/AdminUserDetail'

export function ClientProgress() {
  const [searchParams] = useSearchParams()
  const userDetailId = searchParams.get('user')
  if (userDetailId) {
    return <AdminUserDetail />
  }
  return (
    <AppShell>
      <UnifiedClientList linkPrefix="/admin/clients" staffBase="/admin" isAdmin />
    </AppShell>
  )
}
