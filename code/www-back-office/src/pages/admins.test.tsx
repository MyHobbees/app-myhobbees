import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AdminsPage } from './admins'
import * as api from '@/lib/api'

// No browser-automation tool is available in this environment to drive the
// real click path (see aidd_docs/tasks/.../review.md finding: phase 3,
// criterion 4). This closes that gap at the component level instead: real
// DOM, real React state, real Radix AlertDialog, only the network boundary
// (@/lib/api) mocked.
vi.mock('@/lib/api', () => ({
  getAdmins: vi.fn(),
  createAdmin: vi.fn(),
  deleteAdmin: vi.fn(),
}))

const existingAdmin = {
  id: 1,
  email: 'super@myhobbees.fr',
  isSuperAdmin: true,
  createdAt: '2026-11-01T00:00:00Z',
}

beforeEach(() => {
  vi.mocked(api.getAdmins).mockReset().mockResolvedValue([existingAdmin])
  vi.mocked(api.createAdmin).mockReset()
  vi.mocked(api.deleteAdmin).mockReset()
})

describe('AdminsPage', () => {
  it('submits the create form, appends the new admin, and shows the one-time share link', async () => {
    const user = userEvent.setup()
    const created = {
      id: 2,
      email: 'new-admin@myhobbees.fr',
      isSuperAdmin: false,
      createdAt: '2026-11-10T00:00:00Z',
    }
    vi.mocked(api.createAdmin).mockResolvedValue({
      admin: created,
      shareToken: 'abc123',
    })

    render(<AdminsPage />)
    await waitFor(() =>
      expect(screen.getByText('super@myhobbees.fr')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /ajouter un admin/i }))
    await user.type(screen.getByLabelText(/^email$/i), created.email)
    await user.click(screen.getByRole('button', { name: /^créer$/i }))

    await waitFor(() =>
      expect(screen.getByText(created.email)).toBeInTheDocument(),
    )
    expect(api.createAdmin).toHaveBeenCalledWith(created.email, false)

    const shareLinkInput = await screen.findByLabelText(/lien à transmettre/i)
    expect(shareLinkInput).toHaveValue(
      `${window.location.origin}/credential/abc123`,
    )
  })

  it('has no password field in the create form', async () => {
    const user = userEvent.setup()
    render(<AdminsPage />)
    await waitFor(() =>
      expect(screen.getByText('super@myhobbees.fr')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /ajouter un admin/i }))

    expect(screen.queryByLabelText(/mot de passe/i)).not.toBeInTheDocument()
  })

  it('cancelling the delete confirmation makes no network call and keeps the row', async () => {
    const user = userEvent.setup()
    render(<AdminsPage />)
    await waitFor(() =>
      expect(screen.getByText('super@myhobbees.fr')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /supprimer/i }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: /annuler/i }))

    expect(api.deleteAdmin).not.toHaveBeenCalled()
    expect(screen.getByText('super@myhobbees.fr')).toBeInTheDocument()
  })

  it('confirming the delete dialog calls deleteAdmin and removes the row', async () => {
    const user = userEvent.setup()
    vi.mocked(api.deleteAdmin).mockResolvedValue(undefined)

    render(<AdminsPage />)
    await waitFor(() =>
      expect(screen.getByText('super@myhobbees.fr')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /supprimer/i }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: /^supprimer$/i }))

    await waitFor(() =>
      expect(api.deleteAdmin).toHaveBeenCalledWith(existingAdmin.id),
    )
    await waitFor(() =>
      expect(screen.queryByText('super@myhobbees.fr')).not.toBeInTheDocument(),
    )
  })
})
