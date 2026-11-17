import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { AppLayout } from './app-layout'
import { useEnvStore } from '@/stores/env'

// The stgOnly nav gate is the one piece of the stg-only guard with zero
// automated coverage otherwise (review finding, phase 2 warning 3): the
// server-side guard on /v1/leads/seed has its own Go tests and a live
// check, but nothing exercised this filter — not even dev-tools.test.tsx,
// which only renders the page itself, never the sidebar that decides
// whether "Outils dev" shows up at all.
describe('AppLayout nav — Outils dev stgOnly gate', () => {
  it.each([
    ['null (unknown, fail-closed)', null],
    ['loc', 'loc' as const],
    ['prd', 'prd' as const],
  ])('hides "Outils dev" when env is %s', (_label, env) => {
    useEnvStore.setState({ env })

    render(
      <MemoryRouter>
        <AppLayout>content</AppLayout>
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole('link', { name: /outils dev/i }),
    ).not.toBeInTheDocument()
  })

  it('shows "Outils dev" when env is stg', () => {
    useEnvStore.setState({ env: 'stg' })

    render(
      <MemoryRouter>
        <AppLayout>content</AppLayout>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: /outils dev/i }),
    ).toBeInTheDocument()
  })
})
