import { useEffect, useRef, useState } from 'react'
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

// A single discriminated state, instead of independent loading/data/error
// flags: the revealed credentials and the generic error are mutually
// exclusive by construction, so the UI can never render both at once (see
// aidd_docs/tasks/.../review.md, warning 1 — the previous three-flag
// version could set both data and error and paint them simultaneously).
type State =
  | { status: 'loading' }
  | { status: 'success'; data: CredentialShare }
  | { status: 'error'; message: string }

export function CredentialSharePage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<State>({ status: 'loading' })

  // Guards against the effect running twice for the same token. This
  // matters here specifically because the effect's side effect is
  // destructive and non-idempotent (it spends the one-time token
  // server-side): React.StrictMode double-invokes effects in development
  // to surface exactly this kind of bug, and without the guard the first
  // call would reveal the credentials while the second call's 404
  // (already consumed) overwrites the state right after. The ref persists
  // across that double-invocation (StrictMode re-runs the effect on the
  // same component instance, it does not reset refs), so it is the
  // standard fix for a one-shot effect under StrictMode.
  const consumedTokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!token) {
      setState({
        status: 'error',
        message: 'Ce lien est invalide, expiré ou a déjà été utilisé',
      })
      return
    }
    if (consumedTokenRef.current === token) return
    consumedTokenRef.current = token

    getCredentialShare(token)
      .then((data) => setState({ status: 'success', data }))
      .catch((err) =>
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Erreur inconnue',
        }),
      )
  }, [token])

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>MyHobbees</CardTitle>
          <CardDescription>Identifiants d'administration</CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === 'loading' && (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          )}

          {state.status === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>Lien indisponible</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          {state.status === 'success' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="credential-email">Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="credential-email"
                    readOnly
                    value={state.data.email}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copier l'email"
                    onClick={() => {
                      void navigator.clipboard.writeText(state.data.email)
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
                    value={state.data.password}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copier le mot de passe"
                    onClick={() => {
                      void navigator.clipboard.writeText(state.data.password)
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
