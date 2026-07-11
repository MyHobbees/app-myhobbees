import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from 'recharts'

import { OrderStateBadge } from '@/components/orders/shopify-status'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { getAnalytics, getOrders, type Analytics, type OrderSummary } from '@/lib/api'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

type PeriodKey = 7 | 30 | 90

const periods: { key: PeriodKey; label: string }[] = [
  { key: 7, label: '7 jours' },
  { key: 30, label: '30 jours' },
  { key: 90, label: '90 jours' },
]

const chartConfig = {
  subscription: { label: 'Abonnements', color: 'var(--brand)' },
  oneOff: { label: 'Achats unitaires', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function DashboardPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<PeriodKey>(30)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [recentOrders, setRecentOrders] = useState<OrderSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAnalytics(null)
    getAnalytics(period)
      .then(setAnalytics)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [period])

  useEffect(() => {
    getOrders()
      .then((orders) => setRecentOrders(orders.slice(0, 5)))
      .catch(() => setRecentOrders([]))
  }, [])

  const currency = analytics?.currency || 'EUR'

  const kpis = useMemo(() => {
    if (!analytics) return null
    return [
      { label: 'Chiffre d’affaires', value: formatMoney(analytics.revenue, currency) },
      { label: 'Commandes', value: String(analytics.orders) },
      {
        label: 'Panier moyen',
        value:
          analytics.orders > 0 ? formatMoney(analytics.averageOrder, currency) : '—',
      },
      { label: 'Abonnés actifs', value: String(analytics.activeSubscriptions) },
    ]
  }, [analytics, currency])

  const donutData = useMemo(() => {
    if (!analytics) return []
    return [
      {
        key: 'subscription',
        label: 'Abonnements',
        value: analytics.subscriptionRevenue,
        color: 'var(--brand)',
      },
      {
        key: 'oneOff',
        label: 'Achats unitaires',
        value: analytics.oneOffRevenue,
        color: 'var(--chart-2)',
      },
    ]
  }, [analytics])

  const maxProductRevenue = Math.max(
    1,
    ...(analytics?.topProducts ?? []).map((p) => p.revenue),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Activité de la boutique sur la période
          </p>
        </div>
        <div className="flex items-center gap-2">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                period === p.key
                  ? 'border-transparent bg-brand text-brand-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger les statistiques</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {(kpis ?? Array.from({ length: 4 }, () => null)).map((kpi, index) => (
          <Card key={index} className="py-4">
            <CardContent className="flex flex-col gap-1 px-4">
              {kpi === null ? (
                <>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-20" />
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  <span className="text-2xl font-semibold">{kpi.value}</span>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Évolution du chiffre d’affaires</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics === null ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={analytics.revenueByDay}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tickFormatter={(value: string) => formatDate(value)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => formatDate(String(value))}
                      />
                    }
                  />
                  <Bar
                    dataKey="subscription"
                    stackId="revenue"
                    fill="var(--color-subscription)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="oneOff"
                    stackId="revenue"
                    fill="var(--color-oneOff)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Part des abonnements</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {analytics === null ? (
              <Skeleton className="size-40 rounded-full" />
            ) : (
              <>
                <ChartContainer config={chartConfig} className="h-44 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="key"
                      innerRadius={50}
                      outerRadius={70}
                      strokeWidth={2}
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <dl className="flex w-full flex-col gap-2 text-sm">
                  {donutData.map((entry) => {
                    const share =
                      analytics.revenue > 0
                        ? Math.round((entry.value / analytics.revenue) * 100)
                        : 0
                    return (
                      <div key={entry.key} className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <dt className="text-muted-foreground">{entry.label}</dt>
                        <dd className="ml-auto font-medium">
                          {formatMoney(entry.value, currency)} ({share} %)
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top produits</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {analytics === null ? (
              Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))
            ) : analytics.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune vente sur la période
              </p>
            ) : (
              analytics.topProducts.map((product) => (
                <div key={product.title} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{product.title}</span>
                    <span className="ml-4 shrink-0 text-muted-foreground">
                      {product.quantity} vendu{product.quantity > 1 ? 's' : ''} ·{' '}
                      <span className="font-medium text-foreground">
                        {formatMoney(product.revenue, currency)}
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-brand/60"
                      style={{
                        width: `${Math.round((product.revenue / maxProductRevenue) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières commandes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {recentOrders === null ? (
              Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="mb-3 h-10 w-full" />
              ))
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune commande</p>
            ) : (
              recentOrders.map((order, index) => (
                <div key={order.id}>
                  {index > 0 && <Separator />}
                  <button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{order.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(order.processedAt)}
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      <OrderStateBadge
                        fulfillmentStatus={order.fulfillmentStatus}
                        cancelled={Boolean(order.cancelledAt)}
                        preparing={order.tags.includes('en-preparation')}
                      />
                      <span className="w-20 text-right text-sm font-semibold">
                        {formatMoney(order.total.amount, order.total.currency)}
                      </span>
                    </div>
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
