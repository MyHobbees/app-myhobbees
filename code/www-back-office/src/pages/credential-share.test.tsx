import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
  // double-invokes effects in development — the exact condition that
  // exposed the double-consumption bug (review.md warning 1). Tests that
  // care about that must opt into the same wrapper; the plain render
  // (strict: false, the default) covers the ordinary single-mount case.
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

describe('CredentialSharePage', () => {
  it('reveals the email and password on success', async () => {
    vi.mocked(api.getCredentialShare).mockResolvedValue({
      email: 'new-admin@myhobbees.fr',
      password: 'a-generated-strong-password',
    })

    renderAtToken('valid-token')

    await waitFor(() =>
      expect(screen.getByLabelText(/^email$/i)).toHaveValue(
        'new-admin@myhobbees.fr',
      ),
    )
    expect(screen.getByLabelText('Mot de passe')).toHaveValue(
      'a-generated-strong-password',
    )
    expect(api.getCredentialShare).toHaveBeenCalledWith('valid-token')
  })

  it('shows a generic error message and no credentials on failure, without crashing', async () => {
    vi.mocked(api.getCredentialShare).mockRejectedValue(
      new Error('Ce lien est invalide, expiré ou a déjà été utilisé'),
    )

    renderAtToken('already-consumed-token')

    await waitFor(() =>
      expect(
        screen.getByText(/lien est invalide, expiré ou a déjà été utilisé/i),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument()
  })

  // Direct reproduction of review.md's warning 1: the token-consuming
  // effect has no guard, and <StrictMode> (which wraps the real app in
  // main.tsx) double-invokes effects in development. A one-time,
  // non-idempotent consumption called twice would see its own first
  // success as a second call's "already consumed" 404 — simulated here by
  // having the mock resolve once, then reject on any further call, the
  // same shape the real server would answer with.
  it('consumes the token at most once under StrictMode, and never shows the credentials and the error at the same time', async () => {
    let calls = 0
    vi.mocked(api.getCredentialShare).mockImplementation(() => {
      calls += 1
      if (calls === 1) {
        return Promise.resolve({
          email: 'strict-mode@myhobbees.fr',
          password: 'a-generated-strong-password',
        })
      }
      return Promise.reject(
        new Error('Ce lien est invalide, expiré ou a déjà été utilisé'),
      )
    })

    renderAtToken('strict-mode-token', { strict: true })

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
    expect(calls).toBe(1)
  })
})
