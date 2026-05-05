import { AppShell } from '@/components/layout/AppShell'
import { ClientNutritionSummaryCard } from '@/components/clients/ClientNutritionSummaryCard'
import { DailyCalorieChart } from '@/components/dashboard/DailyCalorieChart'
import { DashboardActionCard } from '@/components/dashboard/DashboardActionCard'
import { FoodLogTable } from '@/components/food/FoodLogTable'
import { KLIEN_DASHBOARD_LOG_CARD_SHELL } from '@/lib/pageCard'
import { CalorieDisclaimer } from '@/components/shared/CalorieDisclaimer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Apple, Ruler } from 'lucide-react'
import { Link } from 'react-router-dom'
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
      <div className="mx-auto max-w-5xl -mt-2 space-y-4 sm:space-y-5">
        <section aria-label="Ringkasan gizi dan kebutuhan kalori">
          <ClientNutritionSummaryCard profile={profile} />
        </section>
        <section aria-label="Aksi cepat">
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <DashboardActionCard
              to="/klien/food-entry"
              title="Tambah entri makanan"
              desc="Catat sarapan, makan siang, snack, atau makan malam."
              icon={Apple}
            />
            <DashboardActionCard
              to="/klien/progress"
              title="Lihat progres"
              desc="Pantau pengukuran dan baca evaluasi rutin dari ahli gizi."
              icon={Ruler}
            />
          </div>
        </section>
        <section aria-label="Grafik kalori 30 hari terakhir">
          <DailyCalorieChart userId={profile?.id} />
        </section>
        <section aria-label="Log makanan">
          <Card className={KLIEN_DASHBOARD_LOG_CARD_SHELL}>
            <CardHeader className="space-y-0 p-0 px-3 pb-2 pt-2 sm:px-4 sm:pt-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold tracking-tight text-neutral-900">
                    Log makanan
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">Ringkas 10 hari terakhir.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              {isLoading ? (
                <div className="space-y-2.5 py-1">
                  <div className="h-10 w-full animate-pulse rounded-lg bg-muted/70" />
                  <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
                  <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
                </div>
              ) : logs.length === 0 ? (
                <div className="rounded-xl border border-border/70 bg-background/60 p-4 text-center shadow-sm">
                  <p className="text-sm font-medium text-foreground">Belum ada catatan makanan.</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Mulai dari 1 entri dulu. Semakin konsisten, grafik dan ringkasanmu makin akurat.
                  </p>
                  <div className="mt-3 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                    <Button asChild size="sm" className="h-9">
                      <Link to="/klien/food-entry">Tambah entri</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-9">
                      <Link to="/klien/progress">Lihat progres</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <FoodLogTable logs={logs} pageSize={3} embedded />
              )}
              <CalorieDisclaimer />
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  )
}
