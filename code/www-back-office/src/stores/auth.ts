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
    { name: 'back-office-auth' },
  ),
)
