import { useState, type FormEvent } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cleanupSeedLeads, seedLeads } from '@/lib/api'
import { useEnvStore } from '@/stores/env'

const DEFAULT_COUNT = 10

export function DevToolsPage() {
  // Same intent as admins.tsx surfacing its restriction at mount (it fires
  // GET /v1/admins immediately instead of waiting for a click): here there
  // is no safe idempotent GET to probe with, so this reads the client-side
  // env store (already populated by initEnv() at app load) to show the
  // restriction before any button is even clickable, rather than only
  // after a 403 comes back. The server-side APP_ENV == "stg" check in
  // SeedLeads/CleanupSeedLeads remains the actual security boundary — this
  // is UX only, and fails closed the same way the nav filter does (null or
  // non-stg both disable the page).
  const env = useEnvStore((s) => s.env)
  const isStg = env === 'stg'

  const [count, setCount] = useState(String(DEFAULT_COUNT))
  const [seeding, setSeeding] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [seedResult, setSeedResult] = useState<{ created: number } | null>(null)
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  async function onSeed(e: FormEvent) {
    e.preventDefault()
    setSeeding(true)
    setError(null)
    setSeedResult(null)
    setCleanupResult(null)
    try {
      const result = await seedLeads(Number(count))
      setSeedResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSeeding(false)
    }
  }

  async function onCleanup() {
    setCleaning(true)
    setError(null)
    setSeedResult(null)
    setCleanupResult(null)
    try {
      const result = await cleanupSeedLeads()
      setCleanupResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Outils dev</h1>
        <p className="text-muted-foreground">
          Peuple la base de données de staging avec des leads de test (sans
          dépendance à Shopify)
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Leads de test</CardTitle>
          <CardDescription>
            Insère directement des lignes dans la table <code>leads</code>,
            reconnaissables par leur email au format{' '}
            <code>seed-&lt;n&gt;@example.test</code>, pour peupler la page
            Inscriptions sans jamais toucher à Shopify.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!isStg && (
            <Alert variant="destructive">
              <AlertTitle>Indisponible hors staging</AlertTitle>
              <AlertDescription>
                Cette page n'a d'effet qu'en environnement stg ; l'API
                refusera toute tentative de seed ou de nettoyage ailleurs.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSeed} className="flex items-end gap-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="seed-count">Quantité</Label>
              <Input
                id="seed-count"
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                disabled={!isStg}
                className="w-24"
              />
            </div>
            <Button type="submit" disabled={seeding || !isStg}>
              {seeding && <Loader2 className="animate-spin" />}
              {seeding ? 'Génération en cours…' : 'Seeder'}
            </Button>
          </form>

          {seedResult && (
            <p className="text-sm text-muted-foreground">
              ✓ {seedResult.created} leads de test créées
            </p>
          )}

          <Separator />

          <div>
            <Button
              variant="outline"
              onClick={onCleanup}
              disabled={cleaning || !isStg}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {cleaning ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {cleaning ? 'Suppression en cours…' : 'Nettoyer les leads de test'}
            </Button>
          </div>

          {cleanupResult && (
            <p className="text-sm text-muted-foreground">
              ✓ {cleanupResult.deleted} leads de test supprimées
            </p>
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
