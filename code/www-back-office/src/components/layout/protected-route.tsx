import { Navigate, Outlet } from 'react-router'

import { AppLayout } from '@/components/layout/app-layout'
import { useAuthStore } from '@/stores/auth'

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
