import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'

import { CredentialSharePage } from './credential-share'
import * as api from '@/lib/api'

vi.mock('@/lib/api', () => ({
  getCredentialShare: vi.fn(),
}))

function renderAtToken(token: string, { strict = false } = {}) {
  const tree = (
    <MemoryRouter initialEntries={[`/credential/${token}`]}>
      <Routes>
        <Route path="/credential/:token" element={<CredentialSharePage />} />
      </Routes>
    </MemoryRouter>
  )
  // main.tsx renders the whole app inside <StrictMode>, which
  // double-invokes effects in development. The page no longer consumes the
  // token from an effect (see the 'does nothing on mount' test below), but
  // tests that touch StrictMode still render through it to document that
  // the guarantee holds regardless of the wrapper.
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

describe('CredentialSharePage', () => {
  // vitest does not reset a vi.mock()'d fn's call count between tests in
  // the same file by default, so the exact-call-count assertions below
  // would otherwise accumulate across tests rather than starting fresh.
  beforeEach(() => {
    vi.mocked(api.getCredentialShare).mockReset()
  })

  // review.md's challenge pass: an effect-driven fetch on mount gets
  // consumed by anything that merely loads the page without a human
  // intending to — React.StrictMode's double-invoke (what originally
  // exposed this), but also link-scanning security middleware (Defender
  // Safe Links, Proofpoint) that executes a page's JS rather than just
  // fetching the URL. Gating consumption behind an explicit click removes
  // that whole class of trigger: nothing can "load" a click.
  it('does not call getCredentialShare on mount, even under StrictMode', () => {
    renderAtToken('valid-token', { strict: true })

    expect(screen.getByRole('button', { name: /révéler/i })).toBeInTheDocument()
    expect(api.getCredentialShare).not.toHaveBeenCalled()
  })

  it('reveals the email and password after clicking Révéler', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getCredentialShare).mockResolvedValue({
      email: 'new-admin@myhobbees.fr',
      password: 'a-generated-strong-password',
    })

    renderAtToken('valid-token')
    await user.click(screen.getByRole('button', { name: /révéler/i }))

    await waitFor(() =>
      expect(screen.getByLabelText(/^email$/i)).toHaveValue(
        'new-admin@myhobbees.fr',
      ),
    )
    expect(screen.getByLabelText('Mot de passe')).toHaveValue(
      'a-generated-strong-password',
    )
    expect(api.getCredentialShare).toHaveBeenCalledExactlyOnceWith('valid-token')
  })

  it('shows a generic error message and no credentials on failure, without crashing', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getCredentialShare).mockRejectedValue(
      new Error('Ce lien est invalide, expiré ou a déjà été utilisé'),
    )

    renderAtToken('already-consumed-token')
    await user.click(screen.getByRole('button', { name: /révéler/i }))

    await waitFor(() =>
      expect(
        screen.getByText(/lien est invalide, expiré ou a déjà été utilisé/i),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument()
  })

  it('never shows the credentials and the error at the same time', async () => {
    const user = userEvent.setup()
    vi.mocked(api.getCredentialShare).mockResolvedValue({
      email: 'strict-mode@myhobbees.fr',
      password: 'a-generated-strong-password',
    })

    renderAtToken('strict-mode-token', { strict: true })
    await user.click(screen.getByRole('button', { name: /révéler/i }))

    await waitFor(() =>
      expect(screen.getByLabelText(/^email$/i)).toHaveValue(
        'strict-mode@myhobbees.fr',
      ),
    )

    // The credentials and the generic error must never both be on
    // screen: the state is a single discriminated union, not two
    // independent flags.
    expect(
      screen.queryByText(/lien est invalide, expiré ou a déjà été utilisé/i),
    ).not.toBeInTheDocument()
    expect(api.getCredentialShare).toHaveBeenCalledOnce()
  })
})
