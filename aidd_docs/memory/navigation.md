# Navigation

## Routing

- `www-back-office`: `react-router`'s `createBrowserRouter`, routes declared explicitly in one place (`src/router.tsx`); every route but `/login` is nested under `ProtectedRoute`, which redirects to `/login` when `useAuthStore` has no token
- `www-shop`: React Router 7 file-based routes under `app/routes` (`@react-router/fs-routes` + the Hydrogen preset), dot-segment nesting (`account.orders.$id.tsx`), trailing-underscore to opt out of parent layout (`abonnements_.box-creative.tsx`), `$.tsx` as the catch-all

## Structure

```mermaid
flowchart LR
    subgraph BackOffice[www-back-office, behind login]
        Dashboard --> Orders --> OrderDetail
        Dashboard --> Products --> ProductDetail
        Dashboard --> Customers --> CustomerDetail
        Dashboard --> ShopifyStatus
        Dashboard --> DevTools
    end
    subgraph Shop[www-shop]
        Home --> Collections --> ProductPage
        Home --> Abonnements["abonnements (box-creative, box-app)"]
        Home --> Account["account (orders, addresses, profile)"]
        Home --> Cart
        Home --> Blogs
    end
```
