import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Package, Search } from 'lucide-react'

import { ProductStatusBadge } from '@/components/orders/shopify-status'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { getProducts, type ProductSummary } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

type ChipKey = 'all' | 'active' | 'draft' | 'archived'

const chipStatuses: Record<ChipKey, string[] | null> = {
  all: null,
  active: ['ACTIVE'],
  draft: ['DRAFT'],
  archived: ['ARCHIVED', 'UNLISTED'],
}

const chips: { key: ChipKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'archived', label: 'Archivés' },
]

export function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<ProductSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chip, setChip] = useState<ChipKey>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [])

  const kpis = useMemo(() => {
    if (!products) return null
    return [
      { label: 'Produits', value: products.length },
      {
        label: 'Actifs',
        value: products.filter((p) => p.status === 'ACTIVE').length,
      },
      {
        label: 'Avec abonnement',
        value: products.filter((p) => p.hasSubscription).length,
      },
      {
        label: 'Stock total',
        value: products.reduce((sum, p) => sum + p.totalInventory, 0),
      },
    ]
  }, [products])

  const counts = useMemo(() => {
    const result = {} as Record<ChipKey, number>
    for (const { key } of chips) {
      const statuses = chipStatuses[key]
      result[key] = statuses
        ? (products ?? []).filter((p) => statuses.includes(p.status)).length
        : (products ?? []).length
    }
    return result
  }, [products])

  const filtered = useMemo(() => {
    if (!products) return []
    const statuses = chipStatuses[chip]
    const query = search.trim().toLowerCase()
    return products.filter((p) => {
      if (statuses && !statuses.includes(p.status)) return false
      if (query && !p.title.toLowerCase().includes(query)) return false
      return true
    })
  }, [products, chip, search])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Produits</h1>
        <p className="text-muted-foreground">Catalogue de la boutique Shopify</p>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger les produits</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {(kpis ?? chips.map((c) => ({ label: c.label, value: null }))).map(
          (kpi, index) => (
            <Card key={index} className="py-4">
              <CardContent className="flex flex-col gap-1 px-4">
                {kpi.value === null ? (
                  <>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-12" />
                  </>
                ) : (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {kpi.label}
                    </span>
                    <span className="text-2xl font-semibold">{kpi.value}</span>
                  </>
                )}
              </CardContent>
            </Card>
          ),
        )}
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

      <div className="relative w-full max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit…"
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Variantes</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Prix</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products === null && !error
              ? Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : filtered.map((product) => (
                  <TableRow
                    key={product.id}
                    onClick={() => navigate(`/products/${product.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="size-10 rounded-md border object-cover"
                          />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-md border bg-muted/50">
                            <Package className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{product.title}</span>
                          {product.hasSubscription && (
                            <Badge
                              variant="outline"
                              className="mt-0.5 w-fit text-xs"
                            >
                              Abonnement
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={product.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.variantsCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.totalInventory}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(product.minPrice.amount, product.minPrice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
            {products !== null && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun produit ne correspond aux filtres
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
