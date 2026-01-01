import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ClientsPage } from './pages/ClientsPage'
import { RegisterPage } from './pages/RegisterPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { StaffPage } from './pages/StaffPage'
import { StaffRegisterPage } from './pages/StaffRegisterPage'
import { StaffReconciliationPage } from './pages/StaffReconciliationPage'
import { ClientRegistrationPage } from './pages/ClientRegistrationPage'
import { RegistrationsPage } from './pages/RegistrationsPage'
import { LoadingScreen } from './components/ui/loading'

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Workers can only access Clients and Register - redirect to clients if trying to access admin pages
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/clients" replace />
  }

  return <>{children}</>
}

// Component to redirect to role-appropriate default page
function DefaultRedirect() {
  const { user } = useAuth()
  // Workers go to clients, admins go to dashboard
  const defaultPath = user?.role === 'admin' ? '/dashboard' : '/clients'
  return <Navigate to={defaultPath} replace />
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/client-registration" element={<ClientRegistrationPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultRedirect />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute adminOnly>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="invoices"
          element={
            <ProtectedRoute adminOnly>
              <InvoicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute adminOnly>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute adminOnly>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        {/* Staff routes */}
        <Route
          path="staff"
          element={
            <ProtectedRoute adminOnly>
              <StaffPage />
            </ProtectedRoute>
          }
        />
        {/* Staff check-in accessible to all - component handles permissions */}
        <Route path="staff-register" element={<StaffRegisterPage />} />
        <Route
          path="staff-reconciliation"
          element={
            <ProtectedRoute adminOnly>
              <StaffReconciliationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="registrations"
          element={
            <ProtectedRoute adminOnly>
              <RegistrationsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all - redirect to role-appropriate page */}
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  )
}

export default App


