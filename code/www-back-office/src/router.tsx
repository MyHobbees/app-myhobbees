import { createBrowserRouter } from 'react-router'

import { ProtectedRoute } from '@/components/layout/protected-route'
import { CustomerDetailPage } from '@/pages/customer-detail'
import { DashboardPage } from '@/pages/dashboard'
import { CustomersPage } from '@/pages/customers'
import { DevToolsPage } from '@/pages/dev-tools'
import { LoginPage } from '@/pages/login'
import { OrderDetailPage } from '@/pages/order-detail'
import { OrdersPage } from '@/pages/orders'
import { ProductDetailPage } from '@/pages/product-detail'
import { ProductsPage } from '@/pages/products'
import { ShopifyStatusPage } from '@/pages/shopify-status'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
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
      { path: 'dev-tools', element: <DevToolsPage /> },
    ],
  },
])
