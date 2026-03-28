import { AppShell } from '@/components/layout/AppShell'
import { FoodEntryForm } from '@/components/food/FoodEntryForm'
import { useAuth } from '@/hooks/useAuth'

export function FoodEntry() {
  const { profile } = useAuth()
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-3 pb-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Catat makanan harian
        </h1>
        {profile?.id ? (
          <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-75 motion-safe:fill-mode-both">
            <FoodEntryForm userId={profile.id} />
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}
