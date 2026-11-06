# Design

## System

- `www-back-office`: shadcn (Radix primitives + `class-variance-authority`) on Tailwind v4, generated components under `src/components/ui/`
- `www-shop`: hand-written components under `app/components`, plain CSS custom properties, no component library or utility-class framework

Each frontend defines its own tokens independently; there is no shared design-token package, but both (and `www-app`) use the same brand palette (pink `#EF476F`/`#ef476f`, gold `#F9C74F`, green `#4E6E58`).

## Tokens

- `www-back-office`: `src/index.css`, Tailwind `@theme inline` mapped to CSS vars under `:root` / `.dark`, toggled by `src/stores/theme.ts`
- `www-shop`: `app/styles/app.css`, plain `:root` CSS custom properties (`--color-*`, `--radius-*`, `--font-*`)

## Components

- `www-back-office`: shadcn primitives (`button`, `card`, `input`, `table`, `sidebar`, ...) composed into domain components under `components/orders`, `components/layout`
- `www-shop`: feature components directly under `app/components` (`Header`, `Footer`, `AddToCartButton`, `SubscriptionOfferPage`, ...), no generated primitive layer

## Accessibility

- `www-shop` lints with `eslint-plugin-jsx-a11y`; `www-back-office` relies on `oxlint`'s defaults only. No explicit contrast/ARIA bar is documented beyond that.
