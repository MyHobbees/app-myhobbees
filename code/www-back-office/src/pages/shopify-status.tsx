import { useEffect, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { getShopifyStatus, type ShopifyStatus } from '@/lib/api'

export function ShopifyStatusPage() {
  const [status, setStatus] = useState<ShopifyStatus | null>(null)

  useEffect(() => {
    getShopifyStatus().then(setStatus)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Shopify</h1>
        <p className="text-muted-foreground">
          État de la connexion à l'API Admin Shopify
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Connexion</CardTitle>
            {status === null ? (
              <Skeleton className="h-6 w-24" />
            ) : status.connected ? (
              <Badge className="bg-green-600 text-white">Connecté</Badge>
            ) : (
              <Badge variant="destructive">Déconnecté</Badge>
            )}
          </div>
          <CardDescription>
            Vérification effectuée via l'API Admin GraphQL
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === null ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : status.connected && status.shop ? (
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Boutique</dt>
                <dd className="font-medium">{status.shop.name}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Domaine</dt>
                <dd className="font-medium">{status.shop.domain}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Devise</dt>
                <dd className="font-medium">{status.shop.currency}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium">{status.shop.plan}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Version API</dt>
                <dd className="font-medium">{status.apiVersion}</dd>
              </div>
            </dl>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Connexion impossible</AlertTitle>
              <AlertDescription>
                {status.error ?? 'Erreur inconnue'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
