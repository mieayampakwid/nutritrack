import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AppShell } from '@/components/layout/AppShell'
import { FoodEntryForm } from '@/components/food/FoodEntryForm'
import { ExerciseLogEntryCard } from '@/components/exercise/ExerciseLogEntryCard'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { toIsoDateLocal, parseIsoDateLocal, formatDateId } from '@/lib/format'
import { cn } from '@/lib/utils'

export function FoodEntry() {
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

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-3 pb-1 sm:space-y-4">
        <header className="space-y-2 text-center">
          <h1 className="text-center text-lg font-semibold tracking-tight text-white sm:text-xl">
            Catat aktivitas harian
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-white/85 max-md:drop-shadow-[0_1px_3px_rgba(0,0,0,0.28)]">
            Catat makanan dan olahraga hari ini. Untuk makanan, isi menu & porsi lalu biarkan AI mengestimasi
            kalori sebelum disimpan.
          </p>
        </header>

        {profile?.id ? (
          <>
            {/* Date picker bar */}
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

            <Card
              className={cn(
                'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-75 motion-safe:fill-mode-both',
                'relative overflow-hidden p-4 shadow-sm sm:p-5',
                'border-border/70 bg-white/90 text-neutral-900 ring-1 ring-black/5 backdrop-blur-sm',
                'max-md:shadow-md md:shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_18px_48px_-18px_rgba(0,0,0,0.22)]',
                MOBILE_DASHBOARD_CARD_SHELL,
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-primary/12 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl"
                aria-hidden
              />
              <div className="relative">
                <FoodEntryForm userId={profile.id} tanggal={selectedDate} />
              </div>
            </Card>
            <section aria-label="Log olahraga">
              <ExerciseLogEntryCard userId={profile.id} tanggal={selectedDate} />
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  )
}
