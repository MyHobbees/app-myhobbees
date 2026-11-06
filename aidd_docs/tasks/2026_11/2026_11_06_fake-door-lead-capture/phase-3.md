---
status: done
---

# Instruction: SEO meta gaps

## Architecture projection

```txt
.
└── code/www-shop/app/routes/
    ├── collections._index.tsx  ✏️ modify (add meta)
    └── policies._index.tsx     ✏️ modify (add meta)
```

## User Journey

```mermaid
flowchart TD
  A[Crawler requests a public page] --> B{meta export present?}
  B -- yes already --> C[20 routes unaffected]
  B -- no, now fixed --> D[collections._index.tsx / policies._index.tsx]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Happy path
    Request /collections and view source => a title and description meta tag are present: browser
    Request /policies and view source => a title and description meta tag are present: browser
```

## Tasks to do

### `1)` Fill the two missing `meta` exports

> Every other public route in `app/routes` already exports `meta` (e.g. `collections.$handle.tsx`, `policies.$handle.tsx`); these two listing pages do not.

1. Add an `export const meta: Route.MetaFunction = () => [...]` to `collections._index.tsx`, matching the title/description shape used in `collections.$handle.tsx`.
2. Add the same to `policies._index.tsx`, matching `policies.$handle.tsx`.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | `/collections` renders a non-empty `<title>` and a `meta[name=description]` tag |
| 1 | `/policies` renders a non-empty `<title>` and a `meta[name=description]` tag |
