import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthState = {
  token: string | null
  email: string | null
  isSuperAdmin: boolean | null
  login: (token: string, email: string, isSuperAdmin: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      isSuperAdmin: null,
      login: (token, email, isSuperAdmin) => set({ token, email, isSuperAdmin }),
      logout: () => set({ token: null, email: null, isSuperAdmin: null }),
    }),
    {
      name: 'back-office-auth',
      version: 1,
      // v0 sessions predate isSuperAdmin and carry a JWT that was never
      // signed with that claim either, so patching the field in place would
      // still 403 on /v1/admins. Clear them instead: the user re-logs in and
      // gets a token that actually has the claim.
      migrate: (_persistedState, version) =>
        version < 1
          ? { token: null, email: null, isSuperAdmin: null }
          : (_persistedState as AuthState),
    },
  ),
)
