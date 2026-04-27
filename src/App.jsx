import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { AppShellLoadingSkeleton } from '@/components/shared/AppShellLoadingSkeleton'
import { useAuth, AuthProvider } from '@/hooks/useAuth'

const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const AdminDashboard = lazy(() =>
  import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)
const FoodUnitMaster = lazy(() =>
  import('@/pages/admin/FoodUnitMaster').then((m) => ({ default: m.FoodUnitMaster })),
)
const ClientProgress = lazy(() =>
  import('@/pages/admin/ClientProgress').then((m) => ({ default: m.ClientProgress })),
)
const ImportData = lazy(() =>
  import('@/pages/admin/ImportData').then((m) => ({ default: m.ImportData })),
)
const GiziDashboard = lazy(() =>
  import('@/pages/ahli-gizi/GiziDashboard').then((m) => ({ default: m.GiziDashboard })),
)
const ClientList = lazy(() =>
  import('@/pages/ahli-gizi/ClientList').then((m) => ({ default: m.ClientList })),
)
const KlienDashboard = lazy(() =>
  import('@/pages/klien/KlienDashboard').then((m) => ({ default: m.KlienDashboard })),
)
const FoodEntry = lazy(() =>
  import('@/pages/klien/FoodEntry').then((m) => ({ default: m.FoodEntry })),
)
const MyProgress = lazy(() =>
  import('@/pages/klien/MyProgress').then((m) => ({ default: m.MyProgress })),
)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
})

function dashboardPath(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'ahli_gizi') return '/gizi/dashboard'
  return '/klien/dashboard'
}

function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) {
    return <AppShellLoadingSkeleton />
  }
  if (!session || !profile) return <Navigate to="/login" replace />
  return <Navigate to={dashboardPath(profile.role)} replace />
}

function RequireAuth({ roles, children }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return <AppShellLoadingSkeleton />
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  if (!profile) return <Navigate to="/login" replace state={{ from: location }} />
  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={dashboardPath(profile.role)} replace />
  }
  return children
}

function RouteFallback() {
  return <AppShellLoadingSkeleton />
}

function RedirectAdminClientsLegacy() {
  const { id } = useParams()
  return <Navigate to={id ? `/admin/clients?client=${encodeURIComponent(id)}` : '/admin/clients'} replace />
}

function RedirectGiziClientsLegacy() {
  const { id } = useParams()
  return <Navigate to={id ? `/gizi/clients?client=${encodeURIComponent(id)}` : '/gizi/clients'} replace />
}

function RedirectAdminClientDataEntry() {
  const { id } = useParams()
  return <Navigate to={`/admin/clients?client=${encodeURIComponent(id)}&tab=bmi`} replace />
}

function RedirectGiziClientDataEntry() {
  const { id } = useParams()
  return <Navigate to={`/gizi/clients?client=${encodeURIComponent(id)}&tab=bmi`} replace />
}

function RedirectAdminBmi() {
  const { clientId } = useParams()
  return (
    <Navigate
      to={clientId ? `/admin/clients?client=${encodeURIComponent(clientId)}&tab=bmi` : '/admin/clients'}
      replace
    />
  )
}

function RedirectGiziBmi() {
  const { clientId } = useParams()
  return (
    <Navigate
      to={clientId ? `/gizi/clients?client=${encodeURIComponent(clientId)}&tab=bmi` : '/gizi/clients'}
      replace
    />
  )
}

function RedirectAdminCalorie() {
  const { clientId } = useParams()
  return (
    <Navigate
      to={
        clientId ? `/admin/clients?client=${encodeURIComponent(clientId)}&tab=bmi` : '/admin/clients'
      }
      replace
    />
  )
}

function RedirectGiziCalorie() {
  const { clientId } = useParams()
  return (
    <Navigate
      to={
        clientId ? `/gizi/clients?client=${encodeURIComponent(clientId)}&tab=bmi` : '/gizi/clients'
      }
      replace
    />
  )
}

function RedirectAdminUsersToClients() {
  return <Navigate to="/admin/clients?list=pengguna" replace />
}

function RedirectAdminUserDetailLegacy() {
  const { id } = useParams()
  return <Navigate to={`/admin/clients?user=${encodeURIComponent(id)}`} replace />
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />

        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth roles={['admin']}>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth roles={['admin']}>
              <RedirectAdminUsersToClients />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <RequireAuth roles={['admin']}>
              <RedirectAdminUserDetailLegacy />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/food-units"
          element={
            <RequireAuth roles={['admin']}>
              <FoodUnitMaster />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <RequireAuth roles={['admin']}>
              <ClientProgress />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/clients/:id"
          element={
            <RequireAuth roles={['admin']}>
              <RedirectAdminClientsLegacy />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/clients/:id/data-entry"
          element={
            <RequireAuth roles={['admin']}>
              <RedirectAdminClientDataEntry />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/data-entry"
          element={
            <RequireAuth roles={['admin']}>
              <Navigate to="/admin/clients" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/import"
          element={
            <RequireAuth roles={['admin']}>
              <ImportData />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/food-logs"
          element={
            <RequireAuth roles={['admin']}>
              <Navigate to="/admin/clients" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/bmi"
          element={
            <RequireAuth roles={['admin']}>
              <Navigate to="/admin/clients" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/bmi/:clientId"
          element={
            <RequireAuth roles={['admin']}>
              <RedirectAdminBmi />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/calorie-needs"
          element={
            <RequireAuth roles={['admin']}>
              <Navigate to="/admin/clients" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/calorie-needs/:clientId"
          element={
            <RequireAuth roles={['admin']}>
              <RedirectAdminCalorie />
            </RequireAuth>
          }
        />

        <Route
          path="/gizi/dashboard"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <GiziDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/clients"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <ClientList />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/clients/:id"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <RedirectGiziClientsLegacy />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/clients/:id/data-entry"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <RedirectGiziClientDataEntry />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/data-entry"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <Navigate to="/gizi/clients" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/food-logs"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <Navigate to="/gizi/clients" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/bmi"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <Navigate to="/gizi/clients" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/bmi/:clientId"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <RedirectGiziBmi />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/calorie-needs"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <Navigate to="/gizi/clients" replace />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/calorie-needs/:clientId"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <RedirectGiziCalorie />
            </RequireAuth>
          }
        />

        <Route
          path="/klien/dashboard"
          element={
            <RequireAuth roles={['klien']}>
              <KlienDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/klien/food-entry"
          element={
            <RequireAuth roles={['klien']}>
              <FoodEntry />
            </RequireAuth>
          }
        />
        <Route
          path="/klien/progress"
          element={
            <RequireAuth roles={['klien']}>
              <MyProgress />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  )
}
