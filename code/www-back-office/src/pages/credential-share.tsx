import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { useParams } from 'react-router'

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
import { getCredentialShare, type CredentialShare } from '@/lib/api'

export function CredentialSharePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<CredentialShare | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setError('Ce lien est invalide, expiré ou a déjà été utilisé')
      setLoading(false)
      return
    }
    getCredentialShare(token)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>MyHobbees</CardTitle>
          <CardDescription>Identifiants d'administration</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          )}

          {!loading && error && (
            <Alert variant="destructive">
              <AlertTitle>Lien indisponible</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && data && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="credential-email">Email</Label>
                <div className="flex gap-2">
                  <Input id="credential-email" readOnly value={data.email} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copier l'email"
                    onClick={() => {
                      void navigator.clipboard.writeText(data.email)
                    }}
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="credential-password">Mot de passe</Label>
                <div className="flex gap-2">
                  <Input
                    id="credential-password"
                    readOnly
                    value={data.password}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copier le mot de passe"
                    onClick={() => {
                      void navigator.clipboard.writeText(data.password)
                    }}
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce lien ne fonctionnera plus : enregistrez ces identifiants
                dès maintenant.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
