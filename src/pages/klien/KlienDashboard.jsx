import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AppShell } from '@/components/layout/AppShell'
import { ClientNutritionSummaryCard } from '@/components/clients/ClientNutritionSummaryCard'
import { DailyCalorieChart } from '@/components/dashboard/DailyCalorieChart'
import { ActivityLogTable } from '@/components/shared/ActivityLogTable'
import { useAuth } from '@/hooks/useAuth'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { useExerciseLogsForUser } from '@/hooks/useExerciseLog'
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
    <AppShell dashboardHero dashboardHeroBareMobile dashboardHeroCompactLogo>
      <div className="mx-auto max-w-5xl -mt-2 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
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

        <section aria-label="Grafik kalori 14 hari terakhir">
          <DailyCalorieChart userId={profile?.id} />
        </section>

        <section aria-label="Ringkasan gizi dan kebutuhan kalori">
          <ClientNutritionSummaryCard profile={profile} />
        </section>
      </div>
    </AppShell>
  )
}
