import type {Config} from '@react-router/dev/config';
import {vercelPreset} from '@vercel/react-router/vite';

/**
 * React Router 7.16.x Configuration for Hydrogen on Vercel
 *
 * Uses the Vercel preset instead of Hydrogen's Oxygen preset, so the app
 * builds as Vercel Functions rather than a Cloudflare Workers bundle.
 */
export default {
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
