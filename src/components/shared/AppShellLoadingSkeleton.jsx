import { Skeleton } from '@/components/ui/skeleton'

/**
 * Full-viewport shell-shaped skeleton for auth/session loading and route lazy-load.
 * Mirrors AppShell layout (sidebar + hero main) so transitions feel continuous after login.
 */
export function AppShellLoadingSkeleton() {
  return (
    <div
      className="flex h-dvh min-h-screen overflow-hidden bg-background"
      aria-busy="true"
      aria-label="Memuat"
    >
      <aside className="z-10 hidden min-h-0 w-56 flex-shrink-0 flex-col gap-3 bg-sidebar p-3 shadow-[4px_0_15px_rgba(0,0,0,0.1)] md:flex">
        <Skeleton className="h-7 w-16 rounded-md" />
        <div className="mt-4 flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="app-hero-split-bg min-w-0 flex-1 overflow-y-auto overflow-x-clip p-3 pb-36 md:p-5 md:pb-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-3">
            <Skeleton className="h-40 w-full rounded-2xl sm:h-44" />
            <div className="mx-auto w-full max-w-xl">
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
            <Skeleton className="min-h-[12rem] w-full rounded-xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
