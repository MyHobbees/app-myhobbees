import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Calendar,
  Download,
  LayoutGrid,
  List,
  ListFilter,
  Search,
} from 'lucide-react'

import { OrderStateBadge } from '@/components/orders/shopify-status'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  fulfillOrder,
  getOrders,
  prepareOrder,
  type OrderSummary,
} from '@/lib/api'
import { formatDateTime, formatMoney, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

type Bucket = 'to-process' | 'in-progress' | 'shipped' | 'cancelled'
type ChipKey = 'all' | Bucket
type PeriodKey = 'all' | '7d' | '30d'

function bucketOf(order: OrderSummary): Bucket {
  if (order.cancelledAt) return 'cancelled'
  switch (order.fulfillmentStatus) {
    case 'FULFILLED':
      return 'shipped'
    case 'IN_PROGRESS':
    case 'PARTIALLY_FULFILLED':
      return 'in-progress'
    default:
      return order.tags.includes('en-preparation') ? 'in-progress' : 'to-process'
  }
}

const chips: { key: ChipKey; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'to-process', label: 'À traiter' },
  { key: 'in-progress', label: 'En préparation' },
  { key: 'shipped', label: 'Expédiées' },
  { key: 'cancelled', label: 'Annulées' },
]

const periods: { key: PeriodKey; label: string }[] = [
  { key: 'all', label: 'Toute la période' },
  { key: '7d', label: '7 derniers jours' },
  { key: '30d', label: '30 derniers jours' },
]

const boardColumns: { bucket: Bucket; label: string; accent: string }[] = [
  { bucket: 'to-process', label: 'À traiter', accent: 'border-t-muted-foreground/40' },
  { bucket: 'in-progress', label: 'En préparation', accent: 'border-t-amber-500' },
  { bucket: 'shipped', label: 'Expédiées', accent: 'border-t-blue-500' },
  { bucket: 'cancelled', label: 'Annulées', accent: 'border-t-destructive' },
]

function isWithinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000
}

export function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chip, setChip] = useState<ChipKey>('all')
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'board'>('list')
  const [actingOn, setActingOn] = useState<string | null>(null)

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [])

  async function onPrepare(id: string) {
    setActingOn(id)
    try {
      await prepareOrder(id)
      setOrders((prev) =>
        (prev ?? []).map((o) =>
          o.id === id ? { ...o, tags: [...o.tags, 'en-preparation'] } : o,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setActingOn(null)
    }
  }

  async function onFulfill(id: string) {
    setActingOn(id)
    try {
      await fulfillOrder(id)
      setOrders((prev) =>
        (prev ?? []).map((o) =>
          o.id === id ? { ...o, fulfillmentStatus: 'FULFILLED' } : o,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setActingOn(null)
    }
  }

  const kpis = useMemo(() => {
    if (!orders) return null
    const currency = orders[0]?.total.currency ?? 'EUR'
    const recent = orders.filter(
      (o) => isWithinDays(o.processedAt, 30) && !o.cancelledAt,
    )
    return [
      {
        label: 'À traiter',
        value: String(orders.filter((o) => bucketOf(o) === 'to-process').length),
      },
      {
        label: 'Expédiées',
        value: String(orders.filter((o) => bucketOf(o) === 'shipped').length),
      },
      { label: 'Commandes (30j)', value: String(recent.length) },
      {
        label: 'CA (30j)',
        value: formatMoney(
          recent.reduce((sum, o) => sum + Number(o.total.amount), 0),
          currency,
        ),
      },
    ]
  }, [orders])

  const counts = useMemo(() => {
    const result = {} as Record<ChipKey, number>
    for (const { key } of chips) {
      result[key] = key === 'all'
        ? (orders ?? []).length
        : (orders ?? []).filter((o) => bucketOf(o) === key).length
    }
    return result
  }, [orders])

  const filtered = useMemo(() => {
    if (!orders) return []
    const query = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (chip !== 'all' && bucketOf(o) !== chip) return false
      if (period !== 'all' && !isWithinDays(o.processedAt, period === '7d' ? 7 : 30))
        return false
      if (
        query &&
        !o.name.toLowerCase().includes(query) &&
        !(o.customer?.name ?? '').toLowerCase().includes(query)
      )
        return false
      return true
    })
  }, [orders, chip, period, search])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Commandes</h1>
          <p className="text-muted-foreground">
            Suivi et préparation des commandes de la boutique
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(view === 'list' && 'bg-brand/10 text-brand')}
              onClick={() => setView('list')}
              aria-label="Vue liste"
            >
              <List />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(view === 'board' && 'bg-brand/10 text-brand')}
              onClick={() => setView('board')}
              aria-label="Vue board"
            >
              <LayoutGrid />
            </Button>
          </div>
          <Button variant="outline">
            <Download />
            Exporter
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger les commandes</AlertTitle>
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
                  <Skeleton className="h-7 w-16" />
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

      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setChip(c.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              chip === c.key
                ? 'border-transparent bg-brand text-brand-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {c.label}
            <span className={cn('ml-1.5', chip === c.key ? 'opacity-80' : 'opacity-60')}>
              {counts[c.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une commande, un client…"
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ListFilter />
              Statut
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {chips.map((c) => (
              <DropdownMenuItem key={c.key} onClick={() => setChip(c.key)}>
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Calendar />
              Période
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {periods.map((p) => (
              <DropdownMenuItem key={p.key} onClick={() => setPeriod(p.key)}>
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {view === 'list' ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders === null && !error
                ? Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : filtered.map((order) => (
                    <TableRow
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{order.name}</span>
                            {order.tags.includes('subscription') && (
                              <Badge variant="outline" className="text-xs">
                                Abonnement
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(order.processedAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.customer ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-brand/15 text-xs text-brand">
                                {initials(order.customer.name)}
                              </AvatarFallback>
                            </Avatar>
                            {order.customer.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.itemsCount} article{order.itemsCount > 1 ? 's' : ''}
                      </TableCell>
                      <TableCell>
                        <OrderStateBadge
                          fulfillmentStatus={order.fulfillmentStatus}
                          cancelled={Boolean(order.cancelledAt)}
                          preparing={order.tags.includes('en-preparation')}
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMoney(order.total.amount, order.total.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
              {orders !== null && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Aucune commande ne correspond aux filtres
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {boardColumns.map((column) => {
            const columnOrders = filtered.filter(
              (o) => bucketOf(o) === column.bucket,
            )
            return (
              <div key={column.bucket} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium">{column.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {columnOrders.length}
                  </span>
                </div>
                {columnOrders.map((order) => (
                  <Card
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className={cn(
                      'cursor-pointer gap-3 border-t-2 py-4 transition-colors hover:bg-muted/50',
                      column.accent,
                    )}
                  >
                    <CardContent className="flex flex-col gap-3 px-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{order.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(order.processedAt)}
                        </span>
                      </div>
                      {order.customer && (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarFallback className="bg-brand/15 text-[10px] text-brand">
                              {initials(order.customer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{order.customer.name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {order.itemsCount} article{order.itemsCount > 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold">
                          {formatMoney(order.total.amount, order.total.currency)}
                        </span>
                      </div>
                      {column.bucket === 'to-process' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand"
                          disabled={actingOn === order.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onPrepare(order.id)
                          }}
                        >
                          Marquer préparée
                        </Button>
                      )}
                      {column.bucket === 'in-progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand"
                          disabled={actingOn === order.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onFulfill(order.id)
                          }}
                        >
                          Marquer expédiée
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {columnOrders.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Aucune commande
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
