import { create } from 'zustand'

import { baseUrl } from '@/lib/api'

export type Env = 'loc' | 'stg' | 'prd'

type EnvState = {
  env: Env | null
  setEnv: (env: Env | null) => void
}

// No `persist` here, unlike theme.ts: the environment must be re-read from
// the API on every load, never cached client-side — a stale `stg` surviving
// across a deploy to prd would be a fail-open bug, not a cosmetic one.
export const useEnvStore = create<EnvState>()((set) => ({
  env: null,
  setEnv: (env) => set({ env }),
}))

// initEnv never throws: a network failure must never block the app from
// loading, it just leaves env at null, which every stgOnly filter treats
// as "not stg" (fail-closed).
export async function initEnv() {
  try {
    const res = await fetch(`${baseUrl}/health`)
    if (!res.ok) return
    const body = (await res.json()) as { env?: string }
    if (body.env === 'loc' || body.env === 'stg' || body.env === 'prd') {
      useEnvStore.getState().setEnv(body.env)
    }
  } catch {
    // Network error: leave env at null.
  }
}
