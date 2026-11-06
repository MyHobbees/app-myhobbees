import { useAuthStore } from '@/stores/auth'

const baseUrl = import.meta.env.VITE_API_URL ?? ''

export class UnauthorizedError extends Error {
  constructor() {
    super('Session expirée')
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token, logout } = useAuthStore.getState()
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers })
  if (res.status === 401 && token) {
    logout()
    throw new UnauthorizedError()
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error ?? `Requête échouée (${res.status})`)
  }
  return body as T
}

export function login(email: string, password: string) {
  return apiFetch<{ token: string; email: string }>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export type ShopifyStatus = {
  connected: boolean
  apiVersion?: string
  error?: string
  shop?: {
    name: string
    domain: string
    currency: string
    plan: string
  }
}

export type OrderSpec = {
  customerId: string
  variantId: string
  quantity: number
  processedAt: string
  tags?: string[]
  contractId?: string
}

export type SeedBase = {
  products: number
  customers: number
  orders: OrderSpec[]
}

export type SeedOrdersResult = {
  created: number
  renewals: number
  throttled: boolean
}

export function seedBase() {
  return apiFetch<SeedBase>('/v1/shopify/seed', { method: 'POST' })
}

export function seedOrders(orders: OrderSpec[]) {
  return apiFetch<SeedOrdersResult>('/v1/shopify/seed/orders', {
    method: 'POST',
    body: JSON.stringify({ orders }),
  })
}

export type CleanupResult = {
  orders: number
  customers: number
  products: number
  sellingPlanGroups: number
  remaining: boolean
  throttled: boolean
}

export function seedCleanup() {
  return apiFetch<CleanupResult>('/v1/shopify/seed/cleanup', { method: 'POST' })
}

export type Money = { amount: string; currency: string }

export type ProductSummary = {
  id: string
  title: string
  status: string
  totalInventory: number
  imageUrl?: string
  minPrice: Money
  variantsCount: number
  hasSubscription: boolean
}

export type ProductDetail = ProductSummary & {
  description?: string
  createdAt: string
  options: { name: string; values: string[] }[]
  variants: {
    id: string
    title: string
    sku?: string
    price: string
    inventoryQuantity: number | null
  }[]
  sellingPlans: string[]
}

export type CustomerSummary = {
  id: string
  name: string
  email?: string
  createdAt: string
  ordersCount: number
  amountSpent: Money
}

export type CustomerDetail = CustomerSummary & {
  address?: {
    line1?: string
    line2?: string
    zip?: string
    city?: string
    country?: string
  }
  orders: {
    id: string
    name: string
    processedAt: string
    financialStatus?: string
    fulfillmentStatus: string
    total: Money
    tags: string[]
  }[]
}

export function getProducts() {
  return apiFetch<ProductSummary[]>('/v1/shopify/products')
}

export function getProduct(id: string) {
  return apiFetch<ProductDetail>(`/v1/shopify/products/${id}`)
}

export type OrderSummary = {
  id: string
  name: string
  processedAt: string
  cancelledAt?: string
  tags: string[]
  financialStatus?: string
  fulfillmentStatus: string
  customer?: { name: string; email?: string }
  itemsCount: number
  total: Money
}

export type OrderDetail = OrderSummary & {
  note?: string
  contractId?: string
  paymentGateways: string[]
  customerId?: string
  customerOrders?: number
  address?: {
    line1?: string
    line2?: string
    zip?: string
    city?: string
    country?: string
  }
  subtotal: Money
  shippingTotal: Money
  lineItems: {
    title: string
    variantTitle?: string
    quantity: number
    unitPrice: Money
  }[]
  fulfillments: {
    createdAt: string
    trackingNumber?: string
    trackingCompany?: string
  }[]
}

export type DayPoint = {
  date: string
  subscription: number
  oneOff: number
}

export type TopProduct = {
  title: string
  quantity: number
  revenue: number
}

export type Analytics = {
  currency: string
  revenue: number
  orders: number
  averageOrder: number
  subscriptionRevenue: number
  oneOffRevenue: number
  activeSubscriptions: number
  revenueByDay: DayPoint[]
  topProducts: TopProduct[]
}

export function getAnalytics(days: number) {
  return apiFetch<Analytics>(`/v1/shopify/analytics?days=${days}`)
}

export function getOrders() {
  return apiFetch<OrderSummary[]>('/v1/shopify/orders')
}

export function getOrder(id: string) {
  return apiFetch<OrderDetail>(`/v1/shopify/orders/${id}`)
}

export function prepareOrder(id: string) {
  return apiFetch<{ ok: boolean }>(`/v1/shopify/orders/${id}/prepare`, {
    method: 'POST',
  })
}

export function fulfillOrder(id: string) {
  return apiFetch<{ ok: boolean }>(`/v1/shopify/orders/${id}/fulfill`, {
    method: 'POST',
  })
}

export function getCustomers() {
  return apiFetch<CustomerSummary[]>('/v1/shopify/customers')
}

export function getCustomer(id: string) {
  return apiFetch<CustomerDetail>(`/v1/shopify/customers/${id}`)
}

export async function getShopifyStatus(): Promise<ShopifyStatus> {
  try {
    return await apiFetch<ShopifyStatus>('/v1/shopify/status')
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue',
    }
  }
}
