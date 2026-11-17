import { createBrowserRouter } from 'react-router'

import { ProtectedRoute } from '@/components/layout/protected-route'
import { AdminsPage } from '@/pages/admins'
import { AnalyticsPage } from '@/pages/analytics'
import { CredentialSharePage } from '@/pages/credential-share'
import { CustomerDetailPage } from '@/pages/customer-detail'
import { DashboardPage } from '@/pages/dashboard'
import { CustomersPage } from '@/pages/customers'
import { DevToolsPage } from '@/pages/dev-tools'
import { LeadsPage } from '@/pages/leads'
import { LoginPage } from '@/pages/login'
import { OrderDetailPage } from '@/pages/order-detail'
import { OrdersPage } from '@/pages/orders'
import { ProductDetailPage } from '@/pages/product-detail'
import { ProductsPage } from '@/pages/products'
import { ShopifyStatusPage } from '@/pages/shopify-status'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // Public, deliberately outside ProtectedRoute's children: the recipient
  // of a credential-share link has no back-office session yet.
  { path: '/credential/:token', element: <CredentialSharePage /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'shopify', element: <ShopifyStatusPage /> },
      { path: 'leads', element: <LeadsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'dev-tools', element: <DevToolsPage /> },
      { path: 'admins', element: <AdminsPage /> },
    ],
  },
])
