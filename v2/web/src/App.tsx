import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'

// Pages - will be implemented
import DashboardPage from '@/pages/DashboardPage'
import ProductsPage from '@/pages/ProductsPage'
import GroupsPage from '@/pages/GroupsPage'
import ImportsPage from '@/pages/ImportsPage'
import ReportsPage from '@/pages/ReportsPage'
import NotFound from '@/pages/NotFound'

// Layout
import { AppShell } from '@/components/layout/AppShell'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
