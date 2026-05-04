import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import {
  Apple,
  CalendarRange,
  ClipboardList,
  ClipboardPen,
  EllipsisVertical,
  LayoutDashboard,
  LogOut,
  Ruler,
  Settings2,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react'
/* eslint-disable-next-line no-unused-vars -- motionPrimitive.span used in JSX below */
import { LayoutGroup, motion as motionPrimitive } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { APP_ACRONYM } from '@/lib/appMeta'
import { getInitials, profileDisplayName } from '@/lib/profileDisplay'
import { cn } from '@/lib/utils'

function homePathForRole(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'ahli_gizi') return '/gizi/dashboard'
  return '/klien/dashboard'
}

function routeActive(pathname, to) {
  if (to.endsWith('/dashboard')) {
    return pathname === to
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

const ROLE_NAV = {
  admin: {
    primary: [
      { to: '/admin/dashboard', label: 'Dasbor', icon: LayoutDashboard },
      { to: '/admin/evaluation', label: 'Evaluasi', icon: CalendarRange },
      { to: '/admin/food-logs', label: 'Log makan', icon: ClipboardList },
      { to: '/admin/users', label: 'User', icon: Users },
    ],
    more: [
      { to: '/admin/clients', label: 'Klien', icon: TrendingUp },
      { to: '/admin/data-entry', label: 'Entri data', icon: ClipboardPen },
      { to: '/admin/import', label: 'Impor', icon: Upload },
      { to: '/admin/food-units', label: 'Master ukuran', icon: Settings2 },
    ],
  },
  ahli_gizi: {
    primary: [
      { to: '/gizi/dashboard', label: 'Dasbor', icon: LayoutDashboard },
      { to: '/gizi/evaluation', label: 'Evaluasi', icon: CalendarRange },
      { to: '/gizi/food-logs', label: 'Log makan', icon: ClipboardList },
      { to: '/gizi/clients', label: 'Klien', icon: Users },
      { to: '/gizi/data-entry', label: 'Entri data', icon: ClipboardPen },
    ],
    more: [],
  },
  klien: {
    primary: [
      { to: '/klien/dashboard', label: 'Dasbor', icon: LayoutDashboard },
      { to: '/klien/food-entry', label: 'Entri', icon: Apple },
      { to: '/klien/progress', label: 'Progres', icon: Ruler },
    ],
    more: [],
  },
}

function SidebarBrand() {
  const { profile } = useAuth()
  const to = homePathForRole(profile?.role)
  if (!profile?.role) return null
  return (
    <Link
      to={to}
      className="mb-4 block rounded-lg px-1 py-1 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
    >
      <span className="block text-lg font-bold tracking-tight text-foreground md:text-xl">{APP_ACRONYM}</span>
    </Link>
  )
}

function SidebarContent({ className }) {
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const role = profile?.role
  const config = ROLE_NAV[role]

  if (!config) return null

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-1.5', className)}>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {config.primary.map((item) => {
          const IconComponent = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-normal transition-colors md:px-3 md:py-2.5 md:text-[0.9375rem] lg:text-base',
                routeActive(location.pathname, item.to)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <IconComponent className="h-4 w-4 shrink-0 md:h-[1.125rem] md:w-[1.125rem]" />
              {item.label}
            </Link>
          )
        })}
        {config.more.map((item) => {
          const IconComponent = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-normal transition-colors md:px-3 md:py-2.5 md:text-[0.9375rem] lg:text-base',
                routeActive(location.pathname, item.to)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <IconComponent className="h-4 w-4 shrink-0 md:h-[1.125rem] md:w-[1.125rem]" />
              {item.label}
            </Link>
          )
        })}
      </div>
      <div className="mt-auto shrink-0 space-y-2 border-t border-border/60 pt-3 md:pt-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-background/30 px-2 py-2 md:gap-3 md:px-3 md:py-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary md:h-10 md:w-10 md:text-sm"
            aria-hidden
          >
            {getInitials(profile?.nama || profile?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-xs font-medium text-foreground md:text-sm"
              title={profileDisplayName(profile)}
            >
              {profileDisplayName(profile)}
            </p>
            {profile?.email ? (
              <p
                className="truncate text-[10px] text-muted-foreground md:text-xs md:leading-snug"
                title={profile.email}
              >
                {profile.email}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground md:h-9 md:text-sm"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </div>
    </div>
  )
}

function MobileBottomNav() {
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const role = profile?.role
  const config = ROLE_NAV[role]
  const [menuOpen, setMenuOpen] = useState(false)

  if (!config) return null

  const allItems = [
    ...config.primary,
    { to: '__more', label: 'Lainnya', icon: EllipsisVertical },
  ]

  const selectedIconAnimation = { scale: [1, 1.12, 1], y: [0, -0.5, 0] }
  const idleIconAnimation = { scale: 1, y: 0 }

  function isItemActive(to) {
    if (to === '__more') return menuOpen
    return routeActive(location.pathname, to)
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-5 z-40 px-4 safe-bottom md:hidden">
        <Card className="pointer-events-auto mx-auto w-full max-w-lg rounded-[2rem] border border-border/70 bg-transparent px-2 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.18)] ring-1 ring-foreground/10 backdrop-blur-xl backdrop-saturate-150">
          <LayoutGroup id="mobile-bottom-nav">
            <div
              className="relative z-10 grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(${allItems.length}, minmax(0, 1fr))` }}
            >
              {allItems.map((item) => {
                const isMore = item.to === '__more'
                const isActive = isItemActive(item.to)
                const Icon = item.icon

                const baseItemClass = cn(
                  'group relative isolate flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-[1.45rem] px-1.5 py-1 text-muted-foreground transition-all duration-150',
                  'hover:bg-muted/50 hover:text-foreground',
                  'active:translate-y-px active:brightness-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )

                const content = (
                  <>
                    {isActive && (
                      <motionPrimitive.span
                        layoutId="mobile-bottom-active-chip"
                        transition={{ type: 'spring', stiffness: 450, damping: 34, mass: 0.85 }}
                        className="pointer-events-none absolute -inset-0.5 z-0 rounded-[1.45rem] border border-white/45 bg-background/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_18px_rgba(0,0,0,0.14)] ring-1 ring-white/35 backdrop-blur-md"
                      />
                    )}
                    <motionPrimitive.span
                      className="relative z-10 flex items-center justify-center"
                      animate={isActive ? selectedIconAnimation : idleIconAnimation}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 transition-colors duration-150',
                          isActive
                            ? 'stroke-[2.5] text-foreground'
                            : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      />
                    </motionPrimitive.span>
                    <span
                      className={cn(
                        'relative z-10 text-center text-[10px] font-medium uppercase leading-tight tracking-wide transition-colors duration-150',
                        isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </span>
                  </>
                )

                if (isMore) {
                  return (
                    <button key={item.to} type="button" onClick={() => setMenuOpen(true)} className={baseItemClass}>
                      {content}
                    </button>
                  )
                }

                return (
                  <Link key={item.to} to={item.to} className={baseItemClass}>
                    {content}
                  </Link>
                )
              })}
            </div>
          </LayoutGroup>
        </Card>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          className="top-auto bottom-0 left-0 right-0 max-h-[min(85vh,520px)] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl border-x-0 border-b-0 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] data-[state=closed]:slide-out-to-bottom-8 data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 md:hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Menu lainnya</DialogTitle>
          </DialogHeader>
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted" />
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
              aria-hidden
            >
              {getInitials(profile?.nama || profile?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{profileDisplayName(profile)}</p>
              {profile?.email ? (
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {config.more.map((item) => {
              const IconComponent = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-9 items-center justify-start whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-card-foreground ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
            <Button
              variant="ghost"
              className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setMenuOpen(false)
                signOut()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function AppShell({
  children,
  dashboardHero = false,
  dashboardContext,
  dashboardHeroBareMobile = false,
  dashboardHeroBareLogo = false,
}) {
  const { profile } = useAuth()
  const isStaff = profile?.role === 'admin' || profile?.role === 'ahli_gizi'

  return (
    <div className="flex h-dvh min-h-screen overflow-hidden bg-background">
      <aside className="z-10 hidden min-h-0 w-56 flex-shrink-0 flex-col bg-sidebar p-3 text-sidebar-foreground shadow-[4px_0_15px_rgba(0,0,0,0.1)] md:flex md:w-60 md:p-4 lg:w-64 lg:p-5">
        <SidebarBrand />
        <SidebarContent className="min-h-0 flex-1" />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main
          data-staff={isStaff ? 'true' : undefined}
          className="app-hero-split-bg min-w-0 flex-1 overflow-y-auto overflow-x-clip p-3 pb-40 md:p-6 md:pb-6 lg:p-8"
        >
          {dashboardHero ? (
            <DashboardHero
              contextLabel={dashboardContext}
              bareOnMobile={dashboardHeroBareMobile}
              bareLogoShell={dashboardHeroBareLogo}
            />
          ) : null}
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
