import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'

import { CredentialSharePage } from './credential-share'
import * as api from '@/lib/api'

vi.mock('@/lib/api', () => ({
  getCredentialShare: vi.fn(),
}))

function renderAtToken(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/credential/${token}`]}>
      <Routes>
        <Route path="/credential/:token" element={<CredentialSharePage />} />
      </Routes>
    </MemoryRouter>,
  )
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
})
