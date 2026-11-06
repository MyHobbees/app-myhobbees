# Forms

## Approach

- No form or validation library anywhere in the web frontends: plain controlled inputs via React `useState`, native HTML `required`/`type` validation
- `www-shop`'s customer-account flows (login, logout, addresses) are not client forms at all — they go through Shopify's Customer Account API via React Router loaders/actions (e.g. `account_.login.tsx` just redirects into `context.customerAccount.login()`)

## Conventions

- Submission: a local `loading` state guards the submit handler, wrapped in try/catch
- Errors: surfaced inline, e.g. `www-back-office`'s `LoginPage` renders the caught error in a `<Alert variant="destructive">` — see `src/pages/login.tsx`
