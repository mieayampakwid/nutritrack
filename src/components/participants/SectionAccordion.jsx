import { useState } from 'react'
import { Activity, Utensils, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react'
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
    icon: Activity,
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    id: 'makan',
    title: 'Log Makan',
    description: 'Riwayat asupan kalori harian',
    icon: Utensils,
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    id: 'olahraga',
    title: 'Olahraga',
    description: 'Catatan aktivitas fisik',
    icon: Dumbbell,
    color: 'bg-blue-500/10 text-blue-600',
  },
]

export function SectionAccordion({
  participantId,
  measurements,
  foodLogs,
  loadingMeasurements,
  loadingFoodLogs,
}) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">Detail Lengkap</h2>

      <div className="space-y-4">
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
  const Icon = section.icon

  return (
    <Card className="overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', section.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isExpanded ? 'Tutup' : 'Buka'}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Content - shown when expanded */}
      {isExpanded && (
        <div className="border-t border-border/60 px-5 py-4">
          {section.id === 'antro' && (
            <>
              {loadingMeasurements ? (
                <LoadingSpinner />
              ) : (
                <MeasurementChart measurements={measurements} metric="berat_badan" />
              )}
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
            </>
          )}

          {section.id === 'olahraga' && (
            <>
              <ExerciseLogHistoryCard userId={participantId} />
            </>
          )}
        </div>
      )}
    </Card>
  )
}
