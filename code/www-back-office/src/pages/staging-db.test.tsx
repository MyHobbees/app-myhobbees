import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { StagingDbPage } from './staging-db'
import * as api from '@/lib/api'

// Same approach as dev-tools.test.tsx: no browser-automation tool is
// available in this environment, so this exercises the real DOM/React
// state with only the network boundary (@/lib/api) mocked. The probe loop
// is driven with vitest's fake timers instead of actually waiting ~5s per
// tick.
vi.mock('@/lib/api', () => ({
  getStagingStatus: vi.fn(),
  startStaging: vi.fn(),
  migrateStaging: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(api.getStagingStatus).mockReset()
  vi.mocked(api.startStaging).mockReset()
  vi.mocked(api.migrateStaging).mockReset()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('StagingDbPage', () => {
  it('probes until available then triggers migration exactly once', async () => {
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    })

    // Mount: stopped. Click "Démarrer": starts, then the poll sequence
    // sees starting -> starting -> available.
    vi.mocked(api.getStagingStatus)
      .mockResolvedValueOnce({ connected: true, status: 'stopped' })
      .mockResolvedValueOnce({ connected: true, status: 'starting' })
      .mockResolvedValueOnce({ connected: true, status: 'starting' })
      .mockResolvedValueOnce({ connected: true, status: 'available' })
    vi.mocked(api.startStaging).mockResolvedValue({ status: 'starting' })
    vi.mocked(api.migrateStaging).mockResolvedValue({ status: 'triggered' })

    render(<StagingDbPage />)

    await waitFor(() => expect(api.getStagingStatus).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Arrêtée')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /démarrer le staging/i }))
    await waitFor(() => expect(api.startStaging).toHaveBeenCalledTimes(1))
    // handleStart's own refresh() call: the 2nd getStagingStatus call.
    await waitFor(() => expect(api.getStagingStatus).toHaveBeenCalledTimes(2))

    // First poll tick: still starting.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(api.getStagingStatus).toHaveBeenCalledTimes(3)
    expect(api.migrateStaging).not.toHaveBeenCalled()

    // Second poll tick: now available -> must trigger the migration.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    await waitFor(() => expect(api.migrateStaging).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(/migrations déclenchées/i)).toBeInTheDocument()

    // Further ticks must never fire again: the interval was cleared once
    // 'available' was observed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })
    expect(api.getStagingStatus).toHaveBeenCalledTimes(4)
    expect(api.migrateStaging).toHaveBeenCalledTimes(1)
  })

  it('shows a migration error without crashing when migrateStaging rejects', async () => {
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    })

    vi.mocked(api.getStagingStatus)
      .mockResolvedValueOnce({ connected: true, status: 'stopped' })
      .mockResolvedValueOnce({ connected: true, status: 'starting' })
      .mockResolvedValueOnce({ connected: true, status: 'available' })
    vi.mocked(api.startStaging).mockResolvedValue({ status: 'starting' })
    vi.mocked(api.migrateStaging).mockRejectedValue(new Error('Impossible de déclencher les migrations'))

    render(<StagingDbPage />)

    await waitFor(() => expect(api.getStagingStatus).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: /démarrer le staging/i }))
    await waitFor(() => expect(api.getStagingStatus).toHaveBeenCalledTimes(2))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() =>
      expect(
        screen.getByText(/impossible de déclencher les migrations/i),
      ).toBeInTheDocument(),
    )
    // The base's own status stays visible and correct despite the
    // migration failure.
    expect(screen.getByText('Disponible')).toBeInTheDocument()
  })

  it('stops polling once unmounted mid-sequence', async () => {
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    })

    vi.mocked(api.getStagingStatus)
      .mockResolvedValueOnce({ connected: true, status: 'stopped' })
      .mockResolvedValueOnce({ connected: true, status: 'starting' })
      .mockResolvedValue({ connected: true, status: 'starting' })
    vi.mocked(api.startStaging).mockResolvedValue({ status: 'starting' })

    const { unmount } = render(<StagingDbPage />)

    await waitFor(() => expect(api.getStagingStatus).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: /démarrer le staging/i }))
    await waitFor(() => expect(api.getStagingStatus).toHaveBeenCalledTimes(2))

    unmount()

    // The interval must be cleared on unmount (useEffect cleanup): letting
    // several ticks' worth of time pass afterwards must call
    // getStagingStatus exactly zero more times, not probe forever in the
    // background for an unmounted page.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(api.getStagingStatus).toHaveBeenCalledTimes(2)
    expect(api.migrateStaging).not.toHaveBeenCalled()
  })

  it('abandons the probe and shows an error when a poll tick rejects persistently', async () => {
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    })

    // getStagingStatus only resolves to {connected:false, error} for an
    // ordinary API failure (see api.ts), but still rethrows on a 401 that
    // forces a logout - that's the one path that reaches here as a real
    // rejection, tick after tick, if nothing catches it.
    vi.mocked(api.getStagingStatus)
      .mockResolvedValueOnce({ connected: true, status: 'stopped' })
      .mockResolvedValueOnce({ connected: true, status: 'starting' })
      .mockRejectedValueOnce(new Error('Session expirée'))
    vi.mocked(api.startStaging).mockResolvedValue({ status: 'starting' })

    render(<StagingDbPage />)

    await waitFor(() => expect(api.getStagingStatus).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: /démarrer le staging/i }))
    await waitFor(() => expect(api.getStagingStatus).toHaveBeenCalledTimes(2))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() =>
      expect(screen.getByText(/session expirée/i)).toBeInTheDocument(),
    )

    // The probe must have stopped, not kept rejecting every 5s: letting
    // more time pass makes no further call.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(api.getStagingStatus).toHaveBeenCalledTimes(3)
    expect(api.migrateStaging).not.toHaveBeenCalled()
  })

  it('does not auto-trigger a migration when the page loads already available', async () => {
    vi.mocked(api.getStagingStatus).mockResolvedValue({
      connected: true,
      status: 'available',
    })

    render(<StagingDbPage />)

    expect(await screen.findByText('Disponible')).toBeInTheDocument()

    // No start was clicked in this session: letting time pass must never
    // call migrateStaging, and must not even keep polling in the
    // background.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(api.getStagingStatus).toHaveBeenCalledTimes(1)
    expect(api.migrateStaging).not.toHaveBeenCalled()
  })
})
