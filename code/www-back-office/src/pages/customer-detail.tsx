import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Mail } from 'lucide-react'

import {
  ShopifyFinancialBadge,
  ShopifyFulfillmentBadge,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCustomer, type CustomerDetail } from '@/lib/api'
import { formatDate, formatDateTime, formatMoney, initials } from '@/lib/format'

export function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getCustomer(id)
      .then(setCustomer)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [id])

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger le client</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link to="/customers">
            <ArrowLeft />
            Retour aux clients
          </Link>
        </Button>
      </div>
    )
  }

  if (!customer) {
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

  const averageOrder =
    customer.ordersCount > 0
      ? Number(customer.amountSpent.amount) / customer.ordersCount
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link to="/customers" aria-label="Retour aux clients">
            <ArrowLeft />
          </Link>
        </Button>
        <Avatar className="size-10">
          <AvatarFallback className="bg-brand/15 text-sm text-brand">
            {initials(customer.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <span className="text-sm text-muted-foreground">
            Client depuis le {formatDate(customer.createdAt)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Commandes</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune commande sur les 60 derniers jours.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commande</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead>Traitement</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => (
                      <TableRow key={order.id}>
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
                          {order.financialStatus ? (
                            <ShopifyFinancialBadge status={order.financialStatus} />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <ShopifyFulfillmentBadge status={order.fulfillmentStatus} />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatMoney(order.total.amount, order.total.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                <span className="truncate">{customer.email || '—'}</span>
              </div>
              {customer.address && (
                <>
                  <Separator />
                  <div className="flex flex-col">
                    {customer.address.line1 && <span>{customer.address.line1}</span>}
                    {customer.address.line2 && <span>{customer.address.line2}</span>}
                    <span>
                      {[customer.address.zip, customer.address.city]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                    {customer.address.country && (
                      <span>{customer.address.country}</span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commandes</span>
                <span className="font-medium">{customer.ordersCount}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total dépensé</span>
                <span className="font-medium">
                  {formatMoney(
                    customer.amountSpent.amount,
                    customer.amountSpent.currency,
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Panier moyen</span>
                <span className="font-medium">
                  {averageOrder === null
                    ? '—'
                    : formatMoney(averageOrder, customer.amountSpent.currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
