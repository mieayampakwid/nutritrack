import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarRange, ClipboardList, Users, Apple } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PopularFoodsTrendCard } from '@/components/dashboard/PopularFoodsTrendCard'
import { DashboardActionCard } from '@/components/dashboard/DashboardActionCard'
import { DailyCalorieChart } from '@/components/dashboard/DailyCalorieChart'
import { ActivityLogTable } from '@/components/shared/ActivityLogTable'
import { ClientNutritionSummaryCard } from '@/components/clients/ClientNutritionSummaryCard'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/hooks/useAuth'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { useExerciseLogsForUser } from '@/hooks/useExerciseLog'
import { toIsoDateLocal, parseIsoDateLocal, formatDateId } from '@/lib/format'

export function GiziDashboard() {
  const { profile } = useAuth()
  const [selectedDate, setSelectedDate] = useState(() => toIsoDateLocal(new Date()))
  const [calendarOpen, setCalendarOpen] = useState(false)

  const prevDay = () => {
    const date = parseIsoDateLocal(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(toIsoDateLocal(date))
  }

  const nextDay = () => {
    const date = parseIsoDateLocal(selectedDate)
    date.setDate(date.getDate() + 1)
    setSelectedDate(toIsoDateLocal(date))
  }

  const { data: logs = [], isLoading: foodLoading } = useFoodLogsForUser(profile?.id, {
    enabled: Boolean(profile?.id),
    dateFrom: selectedDate,
    dateTo: selectedDate,
  })

  const { data: exerciseLogs = [], isLoading: exerciseLoading } = useExerciseLogsForUser(profile?.id, {
    enabled: Boolean(profile?.id),
    dateFrom: selectedDate,
    dateTo: selectedDate,
  })

  return (
    <AppShell dashboardHero dashboardHeroBareLogo>
      <div className="mx-auto max-w-4xl space-y-7 md:space-y-8">
        {/* Ringkasan gizi pribadi */}
        <section aria-label="Ringkasan gizi pribadi" className="mt-4">
          <ClientNutritionSummaryCard profile={profile} />
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

        {/* Grafik kalori mingguan */}
        <section aria-label="Grafik kalori mingguan">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground sm:mb-3 sm:text-sm">
            Grafik kalori 7 hari terakhir
          </h2>
          <DailyCalorieChart userId={profile?.id} days={7} />
        </section>

        {/* Date navigation + food & exercise log */}
        <div className="flex items-center justify-between rounded-2xl bg-white/90 px-4 py-2.5 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
          <button
            onClick={prevDay}
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-600 hover:bg-black/5 active:bg-black/10 transition-colors"
            aria-label="Hari sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex-1 px-4 text-sm font-medium text-neutral-800 tabular-nums hover:bg-black/5 rounded-md transition-colors">
                {formatDateId(parseIsoDateLocal(selectedDate))}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center" sideOffset={8}>
              <Calendar
                mode="single"
                selected={parseIsoDateLocal(selectedDate)}
                onSelect={(d) => {
                  if (d) {
                    setSelectedDate(toIsoDateLocal(d))
                    setCalendarOpen(false)
                  }
                }}
                defaultMonth={parseIsoDateLocal(selectedDate)}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          <button
            onClick={nextDay}
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-600 hover:bg-black/5 active:bg-black/10 transition-colors"
            aria-label="Hari berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <section aria-label="Log makanan">
          {foodLoading ? (
            <div className="space-y-2.5 py-1">
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/70" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
            </div>
          ) : (
            <ActivityLogTable type="food" data={logs} tanggal={selectedDate} userId={profile?.id} />
          )}
        </section>

        <section aria-label="Log olahraga">
          {exerciseLoading ? (
            <div className="space-y-2.5 py-1">
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/70" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
            </div>
          ) : (
            <ActivityLogTable type="exercise" data={exerciseLogs} tanggal={selectedDate} />
          )}
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
