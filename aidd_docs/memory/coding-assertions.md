# Coding Assertions

No lint or test step runs in CI (`.github/workflows/ci-cd.yml` only does Terraform and deploy); these are the commands a contributor runs manually, per area.

## Before commit

| Order | Command | Checks |
| ----- | ------- | ------ |
| 1 | `cd code/api && go vet ./...` | Go vet, API changes |
| 1 | `cd code/www-app && npm run lint` | ESLint (`eslint-config-expo`), app changes |
| 1 | `cd code/www-back-office && npm run lint` | `oxlint`, back-office changes |
| 1 | `cd code/www-shop && npm run lint` | ESLint, storefront changes |

## Before push

| Order | Command | Checks |
| ----- | ------- | ------ |
| 1 | `cd code/api && go test ./...` | Go unit tests |
| 2 | `cd code/www-back-office && npm run build` | `tsc -b` + Vite build |
| 2 | `cd code/www-shop && npm run typecheck` | React Router typegen + `tsc --noEmit` |

## Behavior

If a fix is needed, spawn 1 agent per assertion to fix (e.g. typechecking / tests / rules violated on category UI = 3 agents).
