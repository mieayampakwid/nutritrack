import { AppShell } from '@/components/layout/AppShell'
import { FoodLogTable } from '@/components/food/FoodLogTable'
import { KLIEN_DASHBOARD_LOG_CARD_SHELL } from '@/lib/pageCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CalorieDisclaimer } from '@/components/shared/CalorieDisclaimer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="mx-auto max-w-5xl -mt-2">
        <section aria-label="Log makanan">
          <Card className={KLIEN_DASHBOARD_LOG_CARD_SHELL}>
            <CardHeader className="space-y-0 p-0 px-3 pb-1.5 pt-1.5 sm:px-4 sm:pt-2">
              <CardTitle className="text-center text-sm font-semibold tracking-tight text-neutral-900">
                Log makanan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              {isLoading ? <LoadingSpinner /> : <FoodLogTable logs={logs} pageSize={3} embedded />}
              <CalorieDisclaimer />
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  )
}
