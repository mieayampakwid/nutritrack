import { ClipboardList, Users } from 'lucide-react'
import { PopularFoodsTrendCard } from '@/components/dashboard/PopularFoodsTrendCard'
import { DashboardActionCard } from '@/components/dashboard/DashboardActionCard'
import { AppShell } from '@/components/layout/AppShell'

export function GiziDashboard() {
  return (
    <AppShell dashboardHero>
      <div className="mx-auto max-w-4xl space-y-8">
        <section aria-label="Ringkasan makanan populer">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Ringkasan data</h2>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-sm">
            <PopularFoodsTrendCard className="rounded-none border-0 shadow-none" />
          </div>
        </section>

        <section aria-label="Menu klien">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Klien</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <DashboardActionCard
              to="/gizi/clients"
              title="Daftar klien"
              desc="Antropometri dan ringkasan per klien."
              icon={Users}
            />
            <DashboardActionCard
              to="/gizi/food-logs"
              title="Pantau log makan"
              desc="Filter per klien dan rentang tanggal (mis. 10 hari)."
              icon={ClipboardList}
            />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
