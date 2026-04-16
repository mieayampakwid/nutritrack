import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShellLoadingSkeleton } from '@/components/shared/AppShellLoadingSkeleton'
import { useAuth, AuthProvider } from '@/hooks/useAuth'

const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const AdminDashboard = lazy(() =>
  import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)
const UserManagement = lazy(() =>
  import('@/pages/admin/UserManagement').then((m) => ({ default: m.UserManagement })),
)
const AdminUserDetail = lazy(() =>
  import('@/pages/admin/AdminUserDetail').then((m) => ({ default: m.AdminUserDetail })),
)
const FoodUnitMaster = lazy(() =>
  import('@/pages/admin/FoodUnitMaster').then((m) => ({ default: m.FoodUnitMaster })),
)
const ClientProgress = lazy(() =>
  import('@/pages/admin/ClientProgress').then((m) => ({ default: m.ClientProgress })),
)
const AdminClientDetail = lazy(() =>
  import('@/pages/admin/ClientDetail').then((m) => ({ default: m.ClientDetail })),
)
const ImportData = lazy(() =>
  import('@/pages/admin/ImportData').then((m) => ({ default: m.ImportData })),
)
const FoodLogMonitor = lazy(() =>
  import('@/pages/staff/FoodLogMonitor').then((m) => ({ default: m.FoodLogMonitor })),
)
const ClientUserDataEntry = lazy(() =>
  import('@/pages/staff/ClientUserDataEntry').then((m) => ({ default: m.ClientUserDataEntry })),
)
const ClientDataEntryPicker = lazy(() =>
  import('@/pages/staff/ClientDataEntryPicker').then((m) => ({ default: m.ClientDataEntryPicker })),
)
const GiziDashboard = lazy(() =>
  import('@/pages/ahli-gizi/GiziDashboard').then((m) => ({ default: m.GiziDashboard })),
)
const ClientList = lazy(() =>
  import('@/pages/ahli-gizi/ClientList').then((m) => ({ default: m.ClientList })),
)
const GiziClientDetail = lazy(() =>
  import('@/pages/ahli-gizi/ClientDetail').then((m) => ({ default: m.ClientDetail })),
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
              <UserManagement />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <RequireAuth roles={['admin']}>
              <AdminUserDetail />
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
              <AdminClientDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/clients/:id/data-entry"
          element={
            <RequireAuth roles={['admin']}>
              <ClientUserDataEntry />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/data-entry"
          element={
            <RequireAuth roles={['admin']}>
              <ClientDataEntryPicker />
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
              <FoodLogMonitor />
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
              <GiziClientDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/clients/:id/data-entry"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <ClientUserDataEntry />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/data-entry"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <ClientDataEntryPicker />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/food-logs"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <FoodLogMonitor />
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
