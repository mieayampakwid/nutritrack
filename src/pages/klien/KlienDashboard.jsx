import { useState } from 'react'
import { ChevronLeft, ChevronRight, Apple, Ruler } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AppShell } from '@/components/layout/AppShell'
import { ClientNutritionSummaryCard } from '@/components/clients/ClientNutritionSummaryCard'
import { DailyCalorieChart } from '@/components/dashboard/DailyCalorieChart'
import { DashboardActionCard } from '@/components/dashboard/DashboardActionCard'
import { FoodLogMealGroups } from '@/components/food/FoodLogMealGroups'
import { useAuth } from '@/hooks/useAuth'
import { useFoodLogsForUser, useFoodLogItems } from '@/hooks/useFoodLog'
import { ExerciseLogHistoryCard } from '@/components/exercise/ExerciseLogHistoryCard'
import { toIsoDateLocal, parseIsoDateLocal, formatDateId } from '@/lib/format'

export function KlienDashboard() {
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

  const { data: logs = [], isLoading } = useFoodLogsForUser(profile?.id, {
    enabled: Boolean(profile?.id),
    dateFrom: selectedDate,
    dateTo: selectedDate,
  })

  const logIds = (logs ?? []).map((log) => log.id)
  const { data: items = [] } = useFoodLogItems(logIds, logIds.length > 0)

  const itemsByLogId = {}
  for (const it of items) {
    if (!itemsByLogId[it.food_log_id]) itemsByLogId[it.food_log_id] = []
    itemsByLogId[it.food_log_id].push(it)
  }

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
              title="Tambah diary makanan"
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
          {isLoading ? (
            <div className="space-y-2.5 py-1">
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/70" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/60" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted/50" />
            </div>
          ) : (
            <FoodLogMealGroups logs={logs} itemsByLogId={itemsByLogId} />
          )}
        </section>

        <section aria-label="Log olahraga">
          <ExerciseLogHistoryCard userId={profile?.id} tanggal={selectedDate} />
        </section>
      </div>
    </AppShell>
  )
}
