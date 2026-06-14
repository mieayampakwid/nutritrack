import { PopularFoodsTrendCard } from '@/components/dashboard/PopularFoodsTrendCard'
import { AppShell } from '@/components/layout/AppShell'

export function AdminDashboard() {
  return (
    <AppShell dashboardHero dashboardHeroBareLogo>
      <div className="space-y-6">
        <section aria-label="Makanan populer" className="mt-4">
          <PopularFoodsTrendCard />
        </section>
      </div>
    </AppShell>
  )
}
