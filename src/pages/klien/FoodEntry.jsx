import { AppShell } from '@/components/layout/AppShell'
import { FoodEntryForm } from '@/components/food/FoodEntryForm'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

export function FoodEntry() {
  const { profile } = useAuth()
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-3 pb-1">
        <h1 className="text-center text-lg font-semibold tracking-tight text-white md:text-foreground sm:text-xl">
          Catat makanan harian
        </h1>
        {profile?.id ? (
          <Card
            className={cn(
              'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-75 motion-safe:fill-mode-both',
              'overflow-hidden p-4 shadow-sm sm:p-5',
              MOBILE_DASHBOARD_CARD_SHELL,
            )}
          >
            <FoodEntryForm userId={profile.id} />
          </Card>
        ) : null}
      </div>
    </AppShell>
  )
}
