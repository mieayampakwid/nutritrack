import { Settings2, TrendingUp, Upload, Users } from 'lucide-react'
import { PopularFoodsTrendCard } from '@/components/dashboard/PopularFoodsTrendCard'
import { DashboardActionCard } from '@/components/dashboard/DashboardActionCard'
import { AppShell } from '@/components/layout/AppShell'

const items = [
  {
    to: '/admin/users',
    title: 'Pengguna',
    desc: 'Kelola akun, peran, dan aktivasi.',
    icon: Users,
  },
  {
    to: '/admin/food-units',
    title: 'Master ukuran',
    desc: 'Satuan rumah tangga untuk entri.',
    icon: Settings2,
  },
  {
    to: '/admin/clients',
    title: 'Progres klien',
    desc: 'Antropometri & log makanan.',
    icon: TrendingUp,
  },
  {
    to: '/admin/import',
    title: 'Impor Excel',
    desc: 'Unggah bulk pengguna dari .xlsx.',
    icon: Upload,
  },
]

export function AdminDashboard() {
  return (
    <AppShell dashboardHero>
      <div className="space-y-8">
        <section aria-label="Ringkasan makanan populer">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Ringkasan data</h2>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <PopularFoodsTrendCard className="rounded-none border-0 shadow-none" />
          </div>
        </section>

        <section aria-label="Menu administrasi">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Administrasi</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <DashboardActionCard key={item.to} {...item} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
