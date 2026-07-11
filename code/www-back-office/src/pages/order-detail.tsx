import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowLeft,
  CreditCard,
  Package as PackageIcon,
  Repeat,
  Truck,
} from 'lucide-react'

import {
  OrderStateBadge,
  ShopifyFinancialBadge,
} from '@/components/orders/shopify-status'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fulfillOrder,
  getOrder,
  prepareOrder,
  type OrderDetail,
} from '@/lib/api'
import { formatDateTime, formatMoney, initials } from '@/lib/format'
import { cn } from '@/lib/utils'

function timelineEvents(order: OrderDetail) {
  const events = [{ label: 'Commande créée', date: order.processedAt }]
  if (order.financialStatus === 'PAID') {
    events.push({ label: 'Paiement confirmé', date: order.processedAt })
  }
  for (const fulfillment of order.fulfillments) {
    events.push({ label: 'Colis expédié', date: fulfillment.createdAt })
  }
  if (order.cancelledAt) {
    events.push({ label: 'Commande annulée', date: order.cancelledAt })
  }
  return events
}

export function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    if (!id) return
    getOrder(id)
      .then(setOrder)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [id])

  async function runAction(action: (id: string) => Promise<unknown>) {
    if (!id) return
    setActing(true)
    try {
      await action(id)
      setOrder(await getOrder(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setActing(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger la commande</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link to="/orders">
            <ArrowLeft />
            Retour aux commandes
          </Link>
        </Button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const events = timelineEvents(order)
  const currency = order.total.currency
  const isSubscription = order.tags.includes('subscription')
  const isPreparing = order.tags.includes('en-preparation')
  const isFulfilled = order.fulfillmentStatus === 'FULFILLED'
  const isCancelled = Boolean(order.cancelledAt)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link to="/orders" aria-label="Retour aux commandes">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.name}</h1>
            <OrderStateBadge
              fulfillmentStatus={order.fulfillmentStatus}
              cancelled={isCancelled}
              preparing={isPreparing}
            />
            {order.financialStatus && (
              <ShopifyFinancialBadge status={order.financialStatus} />
            )}
            {isSubscription && <Badge variant="outline">Abonnement</Badge>}
          </div>
          <span className="text-sm text-muted-foreground">
            Passée le {formatDateTime(order.processedAt)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isCancelled && !isFulfilled && !isPreparing && (
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand-deep"
              disabled={acting}
              onClick={() => runAction(prepareOrder)}
            >
              Marquer préparée
            </Button>
          )}
          {!isCancelled && !isFulfilled && isPreparing && (
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand-deep"
              disabled={acting}
              onClick={() => runAction(fulfillOrder)}
            >
              Marquer expédiée
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Articles</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {order.lineItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                    <PackageIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{item.title}</span>
                    {item.variantTitle && (
                      <span className="truncate text-sm text-muted-foreground">
                        {item.variantTitle}
                      </span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-6 text-sm">
                    <span className="text-muted-foreground">× {item.quantity}</span>
                    <span className="w-20 text-right font-medium">
                      {formatMoney(
                        Number(item.unitPrice.amount) * item.quantity,
                        currency,
                      )}
                    </span>
                  </div>
                </div>
              ))}
              <Separator />
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Sous-total</dt>
                  <dd>{formatMoney(order.subtotal.amount, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Frais de livraison</dt>
                  <dd>
                    {Number(order.shippingTotal.amount) === 0
                      ? 'Offerts'
                      : formatMoney(order.shippingTotal.amount, currency)}
                  </dd>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(order.total.amount, currency)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chronologie de traitement</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col">
                {events.map((event, index) => (
                  <li key={`${event.label}-${index}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'mt-1 size-2.5 shrink-0 rounded-full',
                          index === events.length - 1
                            ? 'bg-brand'
                            : 'bg-muted-foreground/40',
                        )}
                      />
                      {index < events.length - 1 && (
                        <span className="w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'flex flex-col',
                        index < events.length - 1 && 'pb-6',
                      )}
                    >
                      <span className="text-sm font-medium">{event.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(event.date)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {order.customer && (
            <Card>
              <CardHeader>
                <CardTitle>Client</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to={order.customerId ? `/customers/${order.customerId}` : '#'}
                  className="flex items-center gap-3"
                >
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-brand/15 text-sm text-brand">
                      {initials(order.customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {order.customer.name}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {order.customer.email}
                    </span>
                    {order.customerOrders ? (
                      <span className="text-xs text-muted-foreground">
                        {order.customerOrders} commande
                        {order.customerOrders > 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Livraison</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {order.address ? (
                <div className="flex flex-col">
                  {order.address.line1 && <span>{order.address.line1}</span>}
                  {order.address.line2 && <span>{order.address.line2}</span>}
                  <span>
                    {[order.address.zip, order.address.city]
                      .filter(Boolean)
                      .join(' ')}
                  </span>
                  {order.address.country && <span>{order.address.country}</span>}
                </div>
              ) : (
                <span className="text-muted-foreground">
                  Aucune adresse de livraison
                </span>
              )}
              {order.fulfillments.length > 0 && (
                <>
                  <Separator />
                  {order.fulfillments[0].trackingCompany && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="size-4" />
                      {order.fulfillments[0].trackingCompany}
                    </div>
                  )}
                  {order.fulfillments[0].trackingNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">N° de suivi</span>
                      <span className="font-medium">
                        {order.fulfillments[0].trackingNumber}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="size-4" />
                {order.paymentGateways.length > 0
                  ? order.paymentGateways.join(', ')
                  : 'Manuel'}
              </div>
              {order.financialStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <ShopifyFinancialBadge status={order.financialStatus} />
                </div>
              )}
              {order.contractId && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Repeat className="size-4" />
                      Contrat
                    </span>
                    <span className="font-medium">{order.contractId}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
