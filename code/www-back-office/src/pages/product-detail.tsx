import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Repeat } from 'lucide-react'

import { ProductStatusBadge } from '@/components/orders/shopify-status'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { getProduct, type ProductDetail } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'

export function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getProduct(id)
      .then(setProduct)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [id])

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger le produit</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link to="/products">
            <ArrowLeft />
            Retour aux produits
          </Link>
        </Button>
      </div>
    )
  }

  if (!product) {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link to="/products" aria-label="Retour aux produits">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{product.title}</h1>
            <ProductStatusBadge status={product.status} />
            {product.hasSubscription && (
              <Badge variant="outline">Abonnement</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            Créé le {formatDate(product.createdAt)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Variantes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variante</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">{variant.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {variant.sku || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {variant.inventoryQuantity ?? 'Non suivi'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatMoney(variant.price, product.minPrice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {product.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {product.description}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {product.sellingPlans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Abonnement</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {product.sellingPlans.map((plan) => (
                  <div key={plan} className="flex items-center gap-2">
                    <Repeat className="size-4 text-brand" />
                    {plan}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock total</span>
                <span className="font-medium">{product.totalInventory}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Variantes</span>
                <span className="font-medium">{product.variantsCount}</span>
              </div>
              {product.options.map((option) => (
                <div key={option.name} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{option.name}</span>
                  <span className="text-right font-medium">
                    {option.values.join(', ')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
