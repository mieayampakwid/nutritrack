import { Users } from 'lucide-react'
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
          <div className="grid max-w-lg gap-3.5 sm:gap-4">
            <DashboardActionCard
              to="/gizi/clients"
              title="Daftar klien"
              desc="Profil, antropometri, evaluasi, log makan, BMI & kebutuhan energi dalam satu halaman."
              icon={Users}
            />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
