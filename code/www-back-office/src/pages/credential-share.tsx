import { useState } from 'react'
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
//
// Consumption happens only from the button's onClick, never from an effect
// on mount. The token is spent server-side the instant it's read, so an
// automatic fetch is "safe" only until something else reads the link first
// without a human meaning to: React.StrictMode double-invoking effects
// (what flagged this originally), but also link-scanning security
// middleware (Defender Safe Links, Proofpoint) that executes a page's JS
// rather than just fetching the URL. A discrete user gesture can't be
// double-invoked by either, so this isn't a guard against a known trigger —
// it removes the class of trigger entirely.
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: CredentialShare }
  | { status: 'error'; message: string }

export function CredentialSharePage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<State>({ status: 'idle' })

  function reveal() {
    if (!token) {
      setState({
        status: 'error',
        message: 'Ce lien est invalide, expiré ou a déjà été utilisé',
      })
      return
    }
    setState({ status: 'loading' })
    getCredentialShare(token)
      .then((data) => setState({ status: 'success', data }))
      .catch((err) =>
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Erreur inconnue',
        }),
      )
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>MyHobbees</CardTitle>
          <CardDescription>Identifiants d'administration</CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === 'idle' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Ce lien n'affiche les identifiants qu'une seule fois. Ne clique
                que si tu es prêt·e à les copier immédiatement : une fois
                révélés, ils ne pourront plus jamais être réaffichés ni
                renvoyés — la seule façon d'en obtenir de nouveaux est de
                recréer le compte.
              </p>
              <Button type="button" onClick={reveal}>
                Révéler les identifiants
              </Button>
            </div>
          )}

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
                Ce lien ne fonctionnera plus : enregistre ces identifiants
                dès maintenant.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
