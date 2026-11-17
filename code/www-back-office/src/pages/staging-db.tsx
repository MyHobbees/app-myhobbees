import { useEffect, useState } from 'react'

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
import { getStagingStatus, startStaging, type StagingStatus } from '@/lib/api'

const statusLabels: Record<string, string> = {
  stopped: 'Arrêtée',
  starting: 'Démarrage...',
  available: 'Disponible',
}

export function StagingDbPage() {
  const [status, setStatus] = useState<StagingStatus | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  function refresh() {
    return getStagingStatus().then(setStatus)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleStart() {
    setStarting(true)
    setStartError(null)
    try {
      await startStaging()
      await refresh()
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

          <div>
            <Button disabled={busy || !canStart} onClick={handleStart}>
              Démarrer le staging
            </Button>
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
