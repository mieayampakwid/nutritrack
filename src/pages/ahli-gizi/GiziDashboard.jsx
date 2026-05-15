import { useMemo } from 'react'
import { CalendarRange, ClipboardList, Users, Apple } from 'lucide-react'
import { PopularFoodsTrendCard } from '@/components/dashboard/PopularFoodsTrendCard'
import { DashboardActionCard } from '@/components/dashboard/DashboardActionCard'
import { DailyCalorieChart } from '@/components/dashboard/DailyCalorieChart'
import { DailyFoodSummary } from '@/components/food/DailyFoodSummary'
import { ActivityLogTable } from '@/components/shared/ActivityLogTable'
import { ClientNutritionSummaryCard } from '@/components/clients/ClientNutritionSummaryCard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { useExerciseLogsForUser } from '@/hooks/useExerciseLog'
import { toIsoDateLocal, formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

export function GiziDashboard() {
  const { profile } = useAuth()
  const today = toIsoDateLocal(new Date())

  const { data: foodLogs = [], isLoading: foodLoading } = useFoodLogsForUser(profile?.id, {
    enabled: Boolean(profile?.id),
    dateFrom: today,
    dateTo: today,
  })

  const todayMacros = useMemo(() => {
    const totals = { kalori: 0, karbohidrat: 0, protein: 0, lemak: 0 }
    for (const log of foodLogs) {
      totals.kalori += Number(log.total_kalori) || 0
      totals.karbohidrat += Number(log.total_karbohidrat) || 0
      totals.protein += Number(log.total_protein) || 0
      totals.lemak += Number(log.total_lemak) || 0
    }
    return totals
  }, [foodLogs])

  const { data: exerciseLogs = [], isLoading: exerciseLoading } = useExerciseLogsForUser(profile?.id, {
    enabled: Boolean(profile?.id),
    recentDays: 14,
  })

  return (
    <AppShell dashboardHero dashboardHeroBareLogo>
      <div className="mx-auto max-w-4xl space-y-7 md:space-y-8">
        {/* Ringkasan gizi pribadi */}
        <section aria-label="Ringkasan gizi pribadi" className="mt-4">
          <ClientNutritionSummaryCard profile={profile} />
        </section>

        {/* Makanan hari ini */}
        <section aria-label="Makanan hari ini">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground sm:mb-3 sm:text-sm">
            Makanan hari ini
          </h2>
          {foodLoading ? (
            <div className="space-y-2.5">
              <div className="h-14 w-full animate-pulse rounded-xl bg-muted/70" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-muted/60" />
            </div>
          ) : (
            <>
              <DailyFoodSummary userId={profile?.id} tanggal={today} />
              <Card className="mt-3 border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Total nutrisi hari ini</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MacroItem label="Kalori" value={todayMacros.kalori} unit="kkal" color="text-amber-600" />
                    <MacroItem label="Karbohidrat" value={todayMacros.karbohidrat} unit="g" color="text-blue-600" />
                    <MacroItem label="Protein" value={todayMacros.protein} unit="g" color="text-emerald-600" />
                    <MacroItem label="Lemak" value={todayMacros.lemak} unit="g" color="text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </section>

        {/* Grafik kalori mingguan */}
        <section aria-label="Grafik kalori mingguan">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground sm:mb-3 sm:text-sm">
            Grafik kalori 7 hari terakhir
          </h2>
          <DailyCalorieChart userId={profile?.id} days={7} />
        </section>

        {/* Log olahraga 14 hari */}
        <section aria-label="Log olahraga 14 hari">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground sm:mb-3 sm:text-sm">
            Log olahraga (14 hari)
          </h2>
          {exerciseLoading ? (
            <div className="space-y-2.5">
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/70" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
            </div>
          ) : (
            <ActivityLogTable type="exercise" data={exerciseLogs} userId={profile?.id} />
          )}
        </section>

        {/* Aksi cepat */}
        <section aria-label="Aksi cepat">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground sm:mb-3 sm:text-sm">
            Catat
          </h2>
          <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
            <DashboardActionCard
              to="/klien/food-entry"
              title="Diary makanan pribadi"
              desc="Catat sarapan, makan siang, snack, atau makan malam."
              icon={Apple}
            />
            <DashboardActionCard
              to="/gizi/my-group"
              title="Daftar klien"
              desc="Antropometri dan ringkasan per klien."
              icon={Users}
            />
          </div>
        </section>

        {/* Makanan populer */}
        <section aria-label="Makanan populer">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground sm:mb-3 sm:text-sm">
            Makanan populer
          </h2>
          <PopularFoodsTrendCard />
        </section>

        {/* Menu klien */}
        <section aria-label="Menu klien">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground sm:mb-3 sm:text-sm">
            Klien
          </h2>
          <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
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

function MacroItem({ label, value, unit, color }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold tabular-nums leading-tight', color)}>
        {formatNumberId(value)}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}
