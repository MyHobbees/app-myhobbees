import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { seedBase, seedCleanup, seedOrders } from '@/lib/api'

type SeedSummary = {
  products: number
  customers: number
  orders: number
  renewals: number
}

type CleanupSummary = {
  orders: number
  customers: number
  products: number
  sellingPlanGroups: number
}

const THROTTLE_WAIT_MS = 60_000

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function DevToolsPage() {
  const [running, setRunning] = useState<'seed' | 'cleanup' | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [seedResult, setSeedResult] = useState<SeedSummary | null>(null)
  const [cleanupResult, setCleanupResult] = useState<CleanupSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setProgress(null)
    setSeedResult(null)
    setCleanupResult(null)
    setError(null)
  }

  async function onSeed() {
    setRunning('seed')
    reset()
    try {
      setProgress('Création des produits et clients…')
      const base = await seedBase()

      let queue = base.orders
      const total = queue.length
      let created = 0
      let renewals = 0
      setProgress(`Création des commandes : 0/${total}`)

      while (queue.length > 0) {
        const res = await seedOrders(queue)
        created += res.created
        renewals += res.renewals
        queue = queue.slice(res.created)
        if (queue.length > 0) {
          setProgress(
            `Création des commandes : ${created}/${total} — pause (limite Shopify, reprise auto)`,
          )
          await wait(THROTTLE_WAIT_MS)
        }
      }

      setSeedResult({
        products: base.products,
        customers: base.customers,
        orders: created,
        renewals,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setRunning(null)
      setProgress(null)
    }
  }

  async function onCleanup() {
    setRunning('cleanup')
    reset()
    try {
      const totals: CleanupSummary = {
        orders: 0,
        customers: 0,
        products: 0,
        sellingPlanGroups: 0,
      }
      let remaining = true
      while (remaining) {
        const res = await seedCleanup()
        totals.orders += res.orders
        totals.customers += res.customers
        totals.products += res.products
        totals.sellingPlanGroups += res.sellingPlanGroups
        remaining = res.remaining
        setProgress(
          `Suppression… ${totals.orders} commandes, ${totals.customers} clients, ${totals.products} produits`,
        )
        if (remaining && res.throttled) {
          await wait(THROTTLE_WAIT_MS)
        }
      }
      setCleanupResult(totals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setRunning(null)
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Outils de développement</h1>
        <p className="text-muted-foreground">
          Utilitaires réservés aux environnements de développement
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Données de test</CardTitle>
          <CardDescription>
            Génère le catalogue de test : la Box Passion en abonnement 12 mois
            (une passion créative par mois), les 12 box individuelles
            correspondantes, des clients et des commandes avec renouvellements
            simulés. Shopify limite la création de commandes (~5/min) : la
            génération complète prend quelques minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onSeed}
              disabled={running !== null}
              className="bg-brand text-brand-foreground hover:bg-brand-deep"
            >
              {running === 'seed' && <Loader2 className="animate-spin" />}
              {running === 'seed'
                ? 'Génération en cours…'
                : 'Générer des données de test'}
            </Button>
            <Button
              variant="outline"
              onClick={onCleanup}
              disabled={running !== null}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {running === 'cleanup' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              {running === 'cleanup'
                ? 'Suppression en cours…'
                : 'Tout supprimer'}
            </Button>
          </div>

          {progress && (
            <p className="text-sm text-muted-foreground">{progress}</p>
          )}

          {seedResult && (
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Produits</dt>
                <dd className="font-medium">{seedResult.products}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Clients</dt>
                <dd className="font-medium">{seedResult.customers}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Commandes</dt>
                <dd className="font-medium">{seedResult.orders}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">dont renouvellements</dt>
                <dd className="font-medium">{seedResult.renewals}</dd>
              </div>
            </dl>
          )}

          {cleanupResult && (
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Commandes supprimées</dt>
                <dd className="font-medium">{cleanupResult.orders}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Clients supprimés</dt>
                <dd className="font-medium">{cleanupResult.customers}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Produits supprimés</dt>
                <dd className="font-medium">{cleanupResult.products}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Groupes d'abonnement</dt>
                <dd className="font-medium">{cleanupResult.sellingPlanGroups}</dd>
              </div>
            </dl>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Échec de l'opération</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
