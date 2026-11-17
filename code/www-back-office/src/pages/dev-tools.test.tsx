import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DevToolsPage } from './dev-tools'
import * as api from '@/lib/api'
import { useEnvStore } from '@/stores/env'

// Same approach as admins.test.tsx: no browser-automation tool is available
// in this environment, so this exercises the real DOM/React state with only
// the network boundary (@/lib/api) mocked.
vi.mock('@/lib/api', () => ({
  seedLeads: vi.fn(),
  cleanupSeedLeads: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(api.seedLeads).mockReset()
  vi.mocked(api.cleanupSeedLeads).mockReset()
  // A user only ever reaches this page via the nav link once env === 'stg'
  // (see app-layout.test.tsx); default most tests to that reality and let
  // the dedicated "off-stg" test below override it.
  useEnvStore.setState({ env: 'stg' })
})

describe('DevToolsPage', () => {
  it('seeds leads with the entered quantity and shows the created count', async () => {
    const user = userEvent.setup()
    vi.mocked(api.seedLeads).mockResolvedValue({ created: 7 })

    render(<DevToolsPage />)

    const input = screen.getByLabelText(/quantité/i)
    await user.clear(input)
    await user.type(input, '7')
    await user.click(screen.getByRole('button', { name: /^seeder$/i }))

    await waitFor(() => expect(api.seedLeads).toHaveBeenCalledWith(7))
    expect(await screen.findByText(/7 leads de test créées/i)).toBeInTheDocument()
  })

  it('cleans up seeded leads and shows the deleted count', async () => {
    const user = userEvent.setup()
    vi.mocked(api.cleanupSeedLeads).mockResolvedValue({ deleted: 4 })

    render(<DevToolsPage />)

    await user.click(
      screen.getByRole('button', { name: /nettoyer les leads de test/i }),
    )

    await waitFor(() => expect(api.cleanupSeedLeads).toHaveBeenCalled())
    expect(
      await screen.findByText(/4 leads de test supprimées/i),
    ).toBeInTheDocument()
  })

  it('shows a generic error alert when the API call fails, e.g. a 403 off-stg', async () => {
    const user = userEvent.setup()
    vi.mocked(api.seedLeads).mockRejectedValue(new Error('Only available on stg'))

    render(<DevToolsPage />)

    await user.click(screen.getByRole('button', { name: /^seeder$/i }))

    expect(
      await screen.findByText(/only available on stg/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/leads de test créées/i)).not.toBeInTheDocument()
  })

  it('defaults the quantity field to 10', () => {
    render(<DevToolsPage />)
    expect(screen.getByLabelText(/quantité/i)).toHaveValue(10)
  })

  it('disables both actions and shows a warning when env is not stg', () => {
    useEnvStore.setState({ env: 'prd' })
    render(<DevToolsPage />)

    expect(screen.getByText(/indisponible hors staging/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^seeder$/i })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /nettoyer les leads de test/i }),
    ).toBeDisabled()
    expect(api.seedLeads).not.toHaveBeenCalled()
  })

  it('clears a stale seed result when a cleanup is run afterwards', async () => {
    const user = userEvent.setup()
    vi.mocked(api.seedLeads).mockResolvedValue({ created: 7 })
    vi.mocked(api.cleanupSeedLeads).mockResolvedValue({ deleted: 7 })

    render(<DevToolsPage />)

    await user.click(screen.getByRole('button', { name: /^seeder$/i }))
    expect(await screen.findByText(/7 leads de test créées/i)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /nettoyer les leads de test/i }),
    )
    await waitFor(() =>
      expect(screen.getByText(/7 leads de test supprimées/i)).toBeInTheDocument(),
    )
    expect(screen.queryByText(/leads de test créées/i)).not.toBeInTheDocument()
  })
})
