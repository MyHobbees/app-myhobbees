---
objective: "Démarrer la base stg depuis le back-office prod déclenche aussi, une fois la base redevenue disponible, les migrations sur stg — sans jamais donner au Lambda API de credentials DB au-delà de ce qu'il a déjà."
status: done
---

# Plan: Migrations stg déclenchées au démarrage de la base

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | `POST /v1/staging/migrate` déclenche le job GitHub Actions existant de migration stg ; le CI push-déclenché ne lance plus jamais les migrations stg lui-même |
| **Source** | Texte (décision d'architecture déjà validée par l'utilisateur — voir conversation) |

## Phases

| #   | Phase                                                  | File                         |
| --- | --------------------------------------------------------- | ----------------------------- |
| 1   | API + infra : déclenchement GitHub Actions, workflow dédié   | [`phase-1.md`](./phase-1.md) |
| 2   | Back-office : auto-déclenchement après démarrage, mémoire     | [`phase-2.md`](./phase-2.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Le Lambda API ne reçoit jamais les credentials DB master de stg, même pour migrer. Il détient un token GitHub (`actions: write`, scope sur ce seul repo) et relance le job de migration déjà existant en CI, qui a lui seul les vrais credentials master en secrets CI. | Le rôle applicatif du Lambda (`DB_APP_USERNAME`/`DB_APP_PASSWORD`) n'a volontairement que SELECT/INSERT/UPDATE/DELETE — pas de `CREATE TABLE`. Lui donner les credentials master pour migrer casserait cette séparation des privilèges sur une Lambda exposée publiquement via API Gateway. Un token GitHub qui fuit ne peut que relancer des jobs CI déjà définis (bornés par ce que `ci-cd.yml`/le nouveau workflow dédié autorisent), pas falsifier/lire directement les données de production ou de staging. |
| Le déclenchement passe par un NOUVEAU fichier workflow dédié (`workflow_dispatch` uniquement), pas par l'ajout de `workflow_dispatch` aux jobs existants de `ci-cd.yml`. | `ci-cd.yml` est un pipeline push-déclenché partagé ; ajouter `workflow_dispatch` à l'un de ses jobs ouvrirait, par la même API, la possibilité de déclencher manuellement n'importe quel autre job du même fichier si le token était un jour mal scopé. Un fichier séparé, contenant SEULEMENT le job de migration stg avec SEULEMENT les secrets `TF_STG__*`, borne strictement le rayon d'action du token même en cas de fuite. |
| Le job `migrate-database-stg` est retiré du pipeline push-déclenché, pas rendu non-bloquant une deuxième fois (il l'est déjà depuis un fix précédent). | Demande explicite de l'utilisateur, maintenant que le déclenchement au démarrage existe : plus besoin de tenter une migration à chaque push alors que la base est très probablement arrêtée à ce moment-là. |
