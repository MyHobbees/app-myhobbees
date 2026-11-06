---
objective: "\"Nos boxs\" shows exactly crochet, couture, and peinture from local data with original SVG illustrations, with no call to Shopify's catalog."
status: implemented
---

# Plan: Nos boxs catalog refresh

## Overview

| Field      | Value                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| **Goal**   | Replace the Shopify-driven "Nos boxes" catalog with a fixed, locally-defined 3-box listing with original illustrations |
| **Source** | [`spec.md`](./spec.md)                                                 |

## Phases

| #   | Phase                                  | File                          |
| --- | ---------------------------------------- | ----------------------------- |
| 1   | Local box data and SVG illustrations   | [`phase-1.md`](./phase-1.md)  |
| 2   | Rewire "Nos boxs" off Shopify           | [`phase-2.md`](./phase-2.md)  |

## Decisions

| Decision | Why |
| --- | --- |
| Box data lives in a new `app/lib/boxes.ts`, a typed `Record<slug, Box>` mirroring `subscriptionOffers.ts` | Same shape of problem (a short, hand-curated list of offerings not backed by a live product feed) already has an established pattern in this codebase; no need for a second one |
| Visuals are hand-authored inline SVG components with light CSS animation, not raster images or GIFs | Confirmed with the user: no real photography/commissioned assets for this delivery; the site already hand-draws its own SVG motifs (`--pattern-waves-*` in `app.css`) rather than using stock art |
| `collections.all.tsx` keeps its route and URL (`/collections/all`) but drops its loader/Shopify query entirely | The header's "Nos boxes" link and the route itself are unaffected elsewhere in the app; only the data source and rendering change |
| No new card component shares code with `ProductItem` | `ProductItem` is typed against Shopify's `CollectionItemFragment`/`ProductItemFragment` and calls `useVariantUrl`, which needs a real product handle — forcing local box data through it would require faking a Shopify product shape for no benefit |
