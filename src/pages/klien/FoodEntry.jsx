import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FoodEntryForm } from '@/components/food/FoodEntryForm'
import { ExerciseEntryForm } from '@/components/exercise/ExerciseEntryForm'
import { DailyFoodSummary } from '@/components/food/DailyFoodSummary'
import { useAuth } from '@/hooks/useAuth'
import { toIsoDateLocal, parseIsoDateLocal, formatDateId } from '@/lib/format'
import { supabase } from '@/lib/supabase'

function useMonthEntryDates(userId, selectedDate) {
  const { monthStart, monthEnd } = useMemo(() => {
    const d = parseIsoDateLocal(selectedDate)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return {
      monthStart: toIsoDateLocal(start),
      monthEnd: toIsoDateLocal(end),
    }
  }, [selectedDate])

  const { data: foodDates = [] } = useQuery({
    queryKey: ['food_entry_dates', userId, monthStart, monthEnd],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('tanggal')
        .eq('user_id', userId)
        .gte('tanggal', monthStart)
        .lte('tanggal', monthEnd)
      if (error) throw error
      return [...new Set((data ?? []).map((r) => r.tanggal))]
    },
  })

  const { data: exerciseDates = [] } = useQuery({
    queryKey: ['exercise_entry_dates', userId, monthStart, monthEnd],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('tanggal')
        .eq('user_id', userId)
        .gte('tanggal', monthStart)
        .lte('tanggal', monthEnd)
      if (error) throw error
      return [...new Set((data ?? []).map((r) => r.tanggal))]
    },
  })

  const entriesByDate = useMemo(() => {
    const map = {}
    for (const d of foodDates) map[d] = (map[d] || 0) | 1
    for (const d of exerciseDates) map[d] = (map[d] || 0) | 2
    return map
  }, [foodDates, exerciseDates])

  return entriesByDate
}

const INDICATOR_DOT =
  "after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-1/2 after:h-[5px] after:w-[5px] after:rounded-full after:bg-primary/70 after:content-['']"

const INDICATOR_DOT_EXERCISE =
  "after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-1/2 after:h-[5px] after:w-[5px] after:rounded-full after:bg-orange-400/70 after:content-['']"

const calendarModifierClass = {
  hasFood: INDICATOR_DOT,
  hasExercise: INDICATOR_DOT_EXERCISE,
}

const CARD_CLASS =
  'rounded-2xl border-border/70 bg-white/90 text-neutral-900 shadow-sm ring-1 ring-black/5 backdrop-blur-sm max-md:shadow-md'

export function FoodEntry() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(() => toIsoDateLocal(new Date()))
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('makanan')
  const [formKey, setFormKey] = useState(0)
  const [exerciseKey, setExerciseKey] = useState(0)

  const entriesByDate = useMonthEntryDates(profile?.id, selectedDate)

  const calendarModifiers = useMemo(() => {
    const hasFood = []
    const hasExercise = []
    for (const [dateStr, flag] of Object.entries(entriesByDate)) {
      if (flag & 1) hasFood.push(parseIsoDateLocal(dateStr))
      if (flag & 2) hasExercise.push(parseIsoDateLocal(dateStr))
    }
    return { hasFood, hasExercise }
  }, [entriesByDate])

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

  const goToday = () => {
    setSelectedDate(toIsoDateLocal(new Date()))
  }

  const isToday = selectedDate === toIsoDateLocal(new Date())

  const handleSaved = () => {
    setFormKey((k) => k + 1)
    setExerciseKey((k) => k + 1)
    qc.invalidateQueries({ queryKey: ['food_entry_dates'] })
    qc.invalidateQueries({ queryKey: ['exercise_entry_dates'] })
  }

  if (!profile?.id) return null

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-3 pb-1 sm:space-y-4">
        <header className="space-y-2 text-center">
          <h1 className="text-center text-lg font-semibold tracking-tight text-white sm:text-xl">
            Catat aktivitas harian
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-white/85 max-md:drop-shadow-[0_1px_3px_rgba(0,0,0,0.28)]">
            Catat makanan dan olahraga harian. AI akan mengestimasi kalori sebelum disimpan.
          </p>
        </header>

        <Card className={CARD_CLASS}>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <div className="flex flex-1 items-center justify-between">
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
                      modifiers={calendarModifiers}
                      modifiersClassNames={calendarModifierClass}
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
              {!isToday && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-xl text-xs h-9"
                  onClick={goToday}
                >
                  Hari ini
                </Button>
              )}
            </div>

            <DailyFoodSummary userId={profile.id} tanggal={selectedDate} />
          </CardContent>
        </Card>

        <Card className={CARD_CLASS}>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full rounded-none border-b border-border/60 bg-transparent p-0 h-auto">
                <TabsTrigger value="makanan" className="flex-1 rounded-none py-2.5 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Makanan
                </TabsTrigger>
                <TabsTrigger value="olahraga" className="flex-1 rounded-none py-2.5 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Olahraga
                </TabsTrigger>
              </TabsList>
              <TabsContent value="makanan" className="mt-0">
                <FoodEntryForm
                  key={formKey}
                  userId={profile.id}
                  tanggal={selectedDate}
                  onSaved={handleSaved}
                />
              </TabsContent>
              <TabsContent value="olahraga" className="mt-0">
                <ExerciseEntryForm
                  key={exerciseKey}
                  userId={profile.id}
                  tanggal={selectedDate}
                  onSaved={handleSaved}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
