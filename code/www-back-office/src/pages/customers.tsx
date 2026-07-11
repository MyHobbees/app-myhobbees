import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
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
import { getCustomers, type CustomerSummary } from '@/lib/api'
import { formatDate, formatMoney, initials } from '@/lib/format'

export function CustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getCustomers()
      .then(setCustomers)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [])

  const kpis = useMemo(() => {
    if (!customers) return null
    const currency = customers[0]?.amountSpent.currency ?? 'EUR'
    const totalSpent = customers.reduce(
      (sum, c) => sum + Number(c.amountSpent.amount),
      0,
    )
    const totalOrders = customers.reduce((sum, c) => sum + c.ordersCount, 0)
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    return [
      { label: 'Clients', value: String(customers.length) },
      {
        label: 'Nouveaux (30j)',
        value: String(
          customers.filter(
            (c) => Date.now() - new Date(c.createdAt).getTime() <= thirtyDays,
          ).length,
        ),
      },
      { label: 'CA cumulé', value: formatMoney(totalSpent, currency) },
      {
        label: 'Panier moyen',
        value:
          totalOrders > 0
            ? formatMoney(totalSpent / totalOrders, currency)
            : '—',
      },
    ]
  }, [customers])

  const filtered = useMemo(() => {
    if (!customers) return []
    const query = search.trim().toLowerCase()
    if (!query) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.email ?? '').toLowerCase().includes(query),
    )
  }, [customers, search])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-muted-foreground">Clients de la boutique Shopify</p>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger les clients</AlertTitle>
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

      <div className="relative w-full max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client…"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Commandes</TableHead>
              <TableHead>Total dépensé</TableHead>
              <TableHead className="text-right">Client depuis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers === null && !error
              ? Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : filtered.map((customer) => (
                  <TableRow
                    key={customer.id}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-brand/15 text-xs text-brand">
                            {initials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {customer.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.ordersCount}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatMoney(
                        customer.amountSpent.amount,
                        customer.amountSpent.currency,
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(customer.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
            {customers !== null && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun client ne correspond à la recherche
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
