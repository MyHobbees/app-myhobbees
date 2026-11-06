# Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- React Router 7
- Hydrogen (as a library, not deployed to Oxygen — this app targets Vercel)
- Vite
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Deployment

This app deploys to Vercel, not Shopify Oxygen. `react-router.config.ts` uses `@vercel/react-router`'s `vercelPreset()`, and `server.ts` wires the Hydrogen context into a plain `(request) => Response` handler (the custom server entry Vercel's React Router integration expects — see its Vite `rollupOptions.input` in `vite.config.ts`). There is no sub-request cache (`caches.open('hydrogen')` requires the Workers Cache API, unavailable on Node) — acceptable since it's optional in `createHydrogenContext`.

## Getting started

**Requirements:**

- Node.js version 18.0.0 or higher

```bash
npm create @shopify/hydrogen@latest
```

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```

## Setup for using Customer Account API (`/account` section)

Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
