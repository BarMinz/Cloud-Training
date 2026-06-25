import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PhaseDetail from './pages/PhaseDetail'
import Admin from './pages/Admin'
import TicketSimulation from './pages/TicketSimulation'
import LampLab from './pages/LampLab'
import AdminLampTerminal from './pages/AdminLampTerminal'
import { Loader2 } from 'lucide-react'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <Navbar />
      <main className="pt-14 min-h-screen">
        <Outlet />
      </main>
    </>
  )
}

function AdminGuard() {
  const { user } = useAuth()
  if (user?.role !== 'admin' && user?.role !== 'main_admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

function GuestGuard() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/phase/:id" element={<PhaseDetail />} />
            <Route path="/phase/1/simulation" element={<TicketSimulation />} />
            <Route path="/phase/2/lab" element={<LampLab />} />
            <Route element={<AdminGuard />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/terminal/:userId" element={<AdminLampTerminal />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
