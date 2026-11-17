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
