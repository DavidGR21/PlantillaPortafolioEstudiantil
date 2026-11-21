import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { AdminRoute } from './AdminRoute.jsx'
import HomePage from '../pages/public/HomePage.jsx'
import NotFoundPage from '../pages/public/NotFoundPage.jsx'
import PortfolioPage from '../pages/public/PortfolioPage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import DashboardPage from '../pages/dashboard/DashboardPage.jsx'
import EditorPage from '../pages/editor/EditorPage.jsx'
import AdminHomePage from '../pages/admin/AdminHomePage.jsx'

export function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/p/:slug" element={<PortfolioPage />} />
      <Route path="/p/:slug/:sectionSlug" element={<PortfolioPage />} />

      {/* Requieren sesión */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Ruta fija: tiene prioridad sobre /p/:slug/:sectionSlug */}
        <Route path="/p/:slug/editar" element={<EditorPage />} />

        {/* Requieren rol admin */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminHomePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
