import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Utensils, Dumbbell, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MeasurementChart } from '@/components/measurement/MeasurementChart'
import { FoodLogTable } from '@/components/food/FoodLogTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ExerciseLogHistoryCard } from '@/components/exercise/ExerciseLogHistoryCard'
import { cn } from '@/lib/utils'

const SECTIONS = [
  {
    id: 'antro',
    title: 'Antropometri',
    description: 'Grafik perkembangan berat, tinggi, dan komposisi tubuh',
    icon: <Activity className="h-5 w-5" />,
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    id: 'makan',
    title: 'Log Makan',
    description: 'Riwayat asupan kalori harian',
    icon: <Utensils className="h-5 w-5" />,
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    id: 'olahraga',
    title: 'Olahraga',
    description: 'Catatan aktivitas fisik',
    icon: <Dumbbell className="h-5 w-5" />,
    color: 'bg-blue-500/10 text-blue-600',
  },
]

export function SectionScrollCards({
  participantId,
  measurements,
  foodLogs,
  loadingMeasurements,
  loadingFoodLogs,
}) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">Detail Lengkap</h2>

      {/* Horizontal scroll container */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex gap-4 sm:grid sm:grid-cols-3 sm:gap-6">
          {SECTIONS.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              participantId={participantId}
              measurements={measurements}
              foodLogs={foodLogs}
              loadingMeasurements={loadingMeasurements}
              loadingFoodLogs={loadingFoodLogs}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  section,
  participantId,
  measurements,
  foodLogs,
  loadingMeasurements,
  loadingFoodLogs,
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card
      className={cn(
        'min-w-[280px] flex-shrink-0 overflow-hidden transition-all sm:min-w-0',
        isExpanded && 'sm:col-span-3',
      )}
    >
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', section.color)}>
              {section.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
          </div>
          {!isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="shrink-0"
            >
              Buka
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="space-y-4">
            {section.id === 'antro' && (
              <>
                {loadingMeasurements ? (
                  <LoadingSpinner />
                ) : (
                  <MeasurementChart
                    measurements={measurements}
                    metric="berat_badan"
                  />
                )}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                  >
                    Tutup
                  </Button>
                </div>
              </>
            )}

            {section.id === 'makan' && (
              <>
                {loadingFoodLogs ? (
                  <LoadingSpinner />
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <FoodLogTable logs={foodLogs} />
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                  >
                    Tutup
                  </Button>
                </div>
              </>
            )}

            {section.id === 'olahraga' && (
              <>
                <ExerciseLogHistoryCard userId={participantId} />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                  >
                    Tutup
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
