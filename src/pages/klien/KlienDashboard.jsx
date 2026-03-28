import { AppShell } from '@/components/layout/AppShell'
import { FoodLogTable } from '@/components/food/FoodLogTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CalorieDisclaimer } from '@/components/shared/CalorieDisclaimer'
import { useAuth } from '@/hooks/useAuth'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'

export function KlienDashboard() {
  const { profile } = useAuth()
  const { data: logs = [], isLoading } = useFoodLogsForUser(profile?.id, {
    enabled: Boolean(profile?.id),
    recentDays: 10,
  })

  return (
    <AppShell dashboardHero dashboardHeroBareMobile dashboardHeroCompactLogo>
      <div className="mx-auto max-w-5xl">
        <section aria-label="Log makanan">
          <h2 className="mb-2 text-center text-sm font-semibold tracking-tight text-foreground">
            Log makanan
          </h2>
          <div className="space-y-4">
            {isLoading ? <LoadingSpinner /> : <FoodLogTable logs={logs} pageSize={3} />}
            <CalorieDisclaimer />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
