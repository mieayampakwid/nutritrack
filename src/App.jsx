import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShellLoadingSkeleton } from '@/components/shared/AppShellLoadingSkeleton'
import { useAuth, AuthProvider } from '@/hooks/useAuth'

const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const ApprovalPendingPage = lazy(() =>
  import('@/pages/auth/ApprovalPendingPage').then((m) => ({
    default: m.ApprovalPendingPage,
  })),
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
const AdminClientDetail = lazy(() =>
  import('@/pages/admin/ClientDetail').then((m) => ({ default: m.ClientDetail })),
)
const AdminGroups = lazy(() =>
  import('@/pages/admin/AdminGroups').then((m) => ({ default: m.AdminGroups })),
)
const AdminUsers = lazy(() =>
  import('@/pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })),
)
const FoodLogMonitor = lazy(() =>
  import('@/pages/staff/FoodLogMonitor').then((m) => ({ default: m.FoodLogMonitor })),
)
const ParticipantEvaluation = lazy(() =>
  import('@/pages/staff/ParticipantEvaluation').then((m) => ({
    default: m.ParticipantEvaluation,
  })),
)
const ClientChangeLog = lazy(() =>
  import('@/pages/staff/ClientChangeLog').then((m) => ({ default: m.ClientChangeLog })),
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
const GiziMyGroup = lazy(() =>
  import('@/pages/ahli-gizi/GiziMyGroup').then((m) => ({ default: m.GiziMyGroup })),
)
const ParticipantDetail = lazy(() =>
  import('@/pages/ahli-gizi/ParticipantDetail').then((m) => ({ default: m.ParticipantDetail })),
)
const ParticipantAssessment = lazy(() =>
  import('@/pages/ahli-gizi/ParticipantAssessment').then((m) => ({ default: m.ParticipantAssessment })),
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
  const { session, profile, loading, isInactive } = useAuth()
  if (loading) {
    return <AppShellLoadingSkeleton />
  }
  if (!session || !profile) return <Navigate to="/login" replace />
  if (isInactive) return <Navigate to="/menunggu-persetujuan" replace />
  return <Navigate to={dashboardPath(profile.role)} replace />
}

function RequireAuth({ roles, children }) {
  const { session, profile, loading, isInactive } = useAuth()
  const location = useLocation()
  if (loading) {
    return <AppShellLoadingSkeleton />
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  if (!profile) return <Navigate to="/login" replace state={{ from: location }} />
  if (isInactive) return <Navigate to="/menunggu-persetujuan" replace />
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
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/menunggu-persetujuan" element={<ApprovalPendingPage />} />
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
          path="/admin/clients/:id/change-log"
          element={
            <RequireAuth roles={['admin']}>
              <ClientChangeLog />
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
          path="/admin/food-logs"
          element={
            <RequireAuth roles={['admin']}>
              <FoodLogMonitor />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/evaluation"
          element={
            <RequireAuth roles={['admin']}>
              <ParticipantEvaluation />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/groups"
          element={
            <RequireAuth roles={['admin']}>
              <AdminGroups />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth roles={['admin']}>
              <AdminUsers />
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
          path="/gizi/clients/:id/change-log"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <ClientChangeLog />
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
          path="/gizi/evaluation"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <ParticipantEvaluation />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/my-group"
          element={
            <RequireAuth roles={['ahli_gizi']}>
              <GiziMyGroup />
            </RequireAuth>
          }
        />
        <Route
          path="/participants/:id/assessment"
          element={
            <RequireAuth roles={['ahli_gizi', 'admin']}>
              <ParticipantAssessment />
            </RequireAuth>
          }
        />
        <Route
          path="/participants/:id"
          element={
            <RequireAuth roles={['ahli_gizi', 'admin']}>
              <ParticipantDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/participants/:id"
          element={
            <RequireAuth roles={['ahli_gizi', 'admin']}>
              <ParticipantDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/gizi/participants/:id/assessment"
          element={
            <RequireAuth roles={['ahli_gizi', 'admin']}>
              <ParticipantAssessment />
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
            <RequireAuth roles={['klien', 'ahli_gizi']}>
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
