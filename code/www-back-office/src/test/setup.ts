import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// RTL's automatic afterEach-cleanup only registers itself when it finds a
// global `afterEach` (true with `test.globals: true`); this project's
// vite.config.ts deliberately keeps that off so test files stay explicit
// about their imports, so cleanup is wired by hand instead.
afterEach(() => {
  cleanup()
})

// jsdom doesn't implement these, and Radix UI's AlertDialog (used by
// src/pages/admins.tsx's delete confirmation) touches them when it opens
// under a pointer-event-driven user-event click.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom also doesn't implement matchMedia, touched at module load by
// src/stores/theme.ts and at mount by src/hooks/use-mobile.ts (used by the
// shadcn Sidebar) — both are reached as soon as any test imports
// src/components/layout/app-layout.tsx.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
