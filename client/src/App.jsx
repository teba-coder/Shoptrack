import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ServerWaking from './components/ServerWaking'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import Products from './pages/Products'
import NewSale from './pages/NewSale'
import Sales from './pages/Sales'

// Loaded only when needed: the charts library is large
const Dashboard = lazy(() => import('./pages/Dashboard'))

export default function App() {
  return (
    <>
    <ServerWaking />
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Suspense fallback={<p className="text-slate-500 dark:text-slate-400">Loading dashboard...</p>}><Dashboard /></Suspense>} />
          <Route path="/products" element={<Products />} />
          <Route path="/sales/new" element={<NewSale />} />
          <Route path="/sales" element={<Sales />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
