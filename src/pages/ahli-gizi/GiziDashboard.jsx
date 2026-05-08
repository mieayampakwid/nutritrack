import { CalendarRange, ClipboardList, Users } from 'lucide-react'
import { PopularFoodsTrendCard } from '@/components/dashboard/PopularFoodsTrendCard'
import { DashboardActionCard } from '@/components/dashboard/DashboardActionCard'
import { AppShell } from '@/components/layout/AppShell'

export function GiziDashboard() {
  return (
    <AppShell dashboardHero dashboardHeroBareLogo>
      <div className="mx-auto max-w-4xl space-y-7 md:space-y-8">
        <section aria-label="Makanan populer" className="mt-4">
          <PopularFoodsTrendCard />
        </section>

        <section aria-label="Menu klien">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground sm:mb-3 sm:text-sm">
            Klien
          </h2>
          <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
            <DashboardActionCard
              to="/gizi/my-group"
              title="Daftar klien"
              desc="Antropometri dan ringkasan per klien."
              icon={Users}
            />
            <DashboardActionCard
              to="/gizi/evaluation"
              title="Evaluasi peserta"
              desc="Rentang minimal 2 minggu, log makan, antropometri, dan rekomendasi."
              icon={CalendarRange}
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
