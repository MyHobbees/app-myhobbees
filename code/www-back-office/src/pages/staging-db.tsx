import { useEffect, useRef, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getStagingStatus,
  migrateStaging,
  startStaging,
  type StagingStatus,
} from '@/lib/api'

const statusLabels: Record<string, string> = {
  stopped: 'Arrêtée',
  starting: 'Démarrage...',
  available: 'Disponible',
}

// A generous ceiling so a stuck poll doesn't run forever in the
// background if something goes wrong, not a real expectation of how long
// a start takes.
const POLL_INTERVAL_MS = 5000
const MAX_POLL_ATTEMPTS = 120 // ~10 minutes at POLL_INTERVAL_MS

export function StagingDbPage() {
  const [status, setStatus] = useState<StagingStatus | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [migrateResult, setMigrateResult] = useState<string | null>(null)
  const [migrateError, setMigrateError] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)

  // Refs, not state: they drive the polling loop's own bookkeeping and
  // must never trigger a re-render on their own.
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollAttemptsRef = useRef(0)
  const migrationTriggeredRef = useRef(false)

  function refresh() {
    return getStagingStatus().then(setStatus)
  }

  function stopPolling() {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  useEffect(() => {
    refresh()
    // Stop probing in the background if the page unmounts mid-sequence
    // (e.g. navigating away right after clicking "Démarrer").
    return stopPolling
  }, [])

  async function triggerMigration() {
    setMigrateError(null)
    setMigrating(true)
    try {
      await migrateStaging()
      setMigrateResult('Migrations déclenchées')
    } catch (error) {
      setMigrateError(error instanceof Error ? error.message : String(error))
    } finally {
      setMigrating(false)
    }
  }

  // The automatic poll-after-start only fires once, right after a fresh
  // start — it never runs again once the base has settled on 'available'.
  // Without this, there is no way back into /migrate for a base that was
  // already running when the page loaded (e.g. a push landed on dev while
  // stg was up, or someone started it from the AWS console instead of
  // here): the workflow tab on GitHub becomes the only way to re-trigger
  // it, which nothing in the UI points to.
  async function handleMigrateNow() {
    setMigrateResult(null)
    await triggerMigration()
  }

  // Only ever called right after a start this session succeeds — a plain
  // status refresh (mount, or someone just checking) must never reach
  // here, so loading the page on an already-'available' base never
  // triggers a migration on its own.
  function startPollingUntilAvailable() {
    stopPolling()
    pollAttemptsRef.current = 0
    migrationTriggeredRef.current = false

    pollIntervalRef.current = setInterval(() => {
      pollAttemptsRef.current += 1
      getStagingStatus()
        .then((next) => {
          setStatus(next)

          if (next.status === 'available' && !migrationTriggeredRef.current) {
            migrationTriggeredRef.current = true
            stopPolling()
            triggerMigration()
            return
          }

          if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
            stopPolling()
            setMigrateError(
              "La base n'est pas devenue disponible à temps, migration non déclenchée",
            )
          }
        })
        .catch((error) => {
          // A persistent failure (not just "not available yet" - getStagingStatus
          // only resolves, see api.ts) must abandon the probe the same way running
          // out of attempts does: otherwise it retries forever in the background,
          // each tick leaving an unhandled rejection, with nothing shown to the user.
          stopPolling()
          setMigrateError(error instanceof Error ? error.message : String(error))
        })
    }, POLL_INTERVAL_MS)
  }

  async function handleStart() {
    setStarting(true)
    setStartError(null)
    setMigrateResult(null)
    setMigrateError(null)
    try {
      await startStaging()
      await refresh()
      startPollingUntilAvailable()
    } catch (error) {
      setStartError(error instanceof Error ? error.message : String(error))
    } finally {
      setStarting(false)
    }
  }

  const busy = status === null || starting
  const canStart = status?.connected && status.status === 'stopped' && !starting

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Base de données staging</h1>
        <p className="text-muted-foreground">
          Démarrer la base de données staging depuis le back-office prod
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Statut</CardTitle>
            {status === null ? (
              <Skeleton className="h-6 w-24" />
            ) : !status.connected ? (
              <Badge variant="destructive">Non configurée</Badge>
            ) : (
              <Badge
                className={
                  status.status === 'available' ? 'bg-green-600 text-white' : undefined
                }
                variant={status.status === 'available' ? undefined : 'secondary'}
              >
                {statusLabels[status.status ?? ''] ?? status.status}
              </Badge>
            )}
          </div>
          <CardDescription>État de l'instance RDS staging</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status?.connected === false && status.error ? (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          ) : null}

          {startError ? (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{startError}</AlertDescription>
            </Alert>
          ) : null}

          {migrateError ? (
            <Alert variant="destructive">
              <AlertTitle>Erreur de migration</AlertTitle>
              <AlertDescription>{migrateError}</AlertDescription>
            </Alert>
          ) : null}

          {migrateResult ? (
            <Alert>
              <AlertTitle>Migrations</AlertTitle>
              <AlertDescription>{migrateResult}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-2">
            <Button disabled={busy || !canStart} onClick={handleStart}>
              Démarrer le staging
            </Button>
            {status?.status === 'available' ? (
              <Button
                variant="outline"
                disabled={migrating}
                onClick={handleMigrateNow}
              >
                {migrating ? 'Migration en cours...' : 'Migrer maintenant'}
              </Button>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">
            La base redémarre seule après 7 jours d'arrêt continu, et s'arrête
            seule après ~30 minutes d'inactivité confirmée.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
