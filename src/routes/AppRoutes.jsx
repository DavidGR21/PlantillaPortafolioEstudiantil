import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { AdminRoute } from './AdminRoute.jsx'
import HomePage from '../pages/public/HomePage.jsx'
import NotFoundPage from '../pages/public/NotFoundPage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import DashboardPage from '../pages/dashboard/DashboardPage.jsx'
import AdminHomePage from '../pages/admin/AdminHomePage.jsx'

export function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Requieren sesión */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Requieren rol admin */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminHomePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
