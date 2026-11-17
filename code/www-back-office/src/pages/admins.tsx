import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createAdmin, deleteAdmin, getAdmins, type Admin } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

export function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    getAdmins()
      .then(setAdmins)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Erreur inconnue'),
      )
  }, [])

  function resetForm() {
    setEmail('')
    setIsSuperAdmin(false)
    setFormError(null)
    setShareLink(null)
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setFormError(null)
    try {
      const { admin: created, shareToken } = await createAdmin(email, isSuperAdmin)
      setAdmins((prev) => [...(prev ?? []), created])
      setShareLink(`${window.location.origin}/credential/${shareToken}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setCreating(false)
    }
  }

  function onCloseSheet() {
    setSheetOpen(false)
    resetForm()
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAdmin(deleteTarget.id)
      setAdmins((prev) => prev?.filter((a) => a.id !== deleteTarget.id) ?? prev)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Administrateurs</h1>
          <p className="text-muted-foreground">
            Gestion des comptes ayant accès au back-office
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus />
          Ajouter un admin
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>Impossible de charger les administrateurs</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) onCloseSheet()
        }}
      >
        <SheetContent>
          {shareLink === null ? (
            <>
              <SheetHeader>
                <SheetTitle>Ajouter un administrateur</SheetTitle>
                <SheetDescription>
                  Un mot de passe est généré automatiquement ; vous recevrez
                  un lien à usage unique pour le transmettre.
                </SheetDescription>
              </SheetHeader>
              <form
                onSubmit={onCreate}
                className="flex flex-1 flex-col gap-4 px-4"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isSuperAdmin}
                    onChange={(e) => setIsSuperAdmin(e.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  Super-admin
                </label>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <div className="mt-auto flex justify-end gap-2 pb-4">
                  <Button type="button" variant="outline" onClick={onCloseSheet}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Création…' : 'Créer'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Administrateur créé</SheetTitle>
                <SheetDescription>
                  Lien à usage unique : il expire sous 24h et ne pourra plus
                  être affiché une fois ouvert.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="share-link">Lien à transmettre</Label>
                  <div className="flex gap-2">
                    <Input id="share-link" readOnly value={shareLink} />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Copier le lien"
                      onClick={() => {
                        void navigator.clipboard.writeText(shareLink)
                      }}
                    >
                      <Copy />
                    </Button>
                  </div>
                </div>
              </div>
              <SheetFooter>
                <Button type="button" onClick={onCloseSheet}>
                  Fermer
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins === null && !error
              ? Array.from({ length: 3 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : admins?.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant={admin.isSuperAdmin ? 'default' : 'secondary'}>
                        {admin.isSuperAdmin ? 'Super-admin' : 'Admin'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(admin.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        onClick={() => {
                          setDeleteError(null)
                          setDeleteTarget(admin)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            {admins !== null && admins.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun administrateur
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet administrateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.email} perdra immédiatement ses droits de gestion
              des administrateurs ; son accès au reste du back-office prendra
              fin à l'expiration de son jeton (sous 24h). Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void onConfirmDelete()
              }}
              disabled={deleting}
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
