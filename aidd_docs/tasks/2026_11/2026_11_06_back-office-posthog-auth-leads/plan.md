---
objective: "Le back-office n'est accessible qu'avec un JWT valide vérifié côté serveur, affiche un dashboard d'events PostHog avec de vrais graphiques recharts, et liste les inscriptions waitlist (leads) pour suivre le lancement."
status: implemented
---

# Plan: Auth serveur, dashboard PostHog et liste des leads au back-office

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Sécuriser l'accès serveur au back-office (JWT réellement vérifié), puis y ajouter deux pages de pilotage de lancement : analytics PostHog (graphiques) et inscriptions waitlist (leads) |
| **Source** | Texte (contrat fourni par l'utilisateur, déjà framé — voir conversation) |

## Phases

| #   | Phase                                   | File                         |
| --- | ---------------------------------------- | ---------------------------- |
| 1   | Middleware d'auth JWT côté API           | [`phase-1.md`](./phase-1.md) |
| 2   | Endpoint + page back-office des leads     | [`phase-2.md`](./phase-2.md) |
| 3   | Proxy + dashboard PostHog                 | [`phase-3.md`](./phase-3.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| https://posthog.com/docs/api/queries | `POST https://eu.posthog.com/api/projects/337481/query/` avec body `{"query": {"kind": "HogQLQuery", "query": "<sql>"}}` et header `Authorization: Bearer <personal_api_key>` ; limite 120 requêtes/heure ; 100 lignes par défaut |

## Decisions

| Decision | Why |
| -------- | --- |
| La Personal API Key PostHog (`phx_...`, scope large sur le compte) ne vit que côté `code/api` (variable d'env `POSTHOG_PERSONAL_API_KEY`), jamais côté back-office/client | Elle n'est pas limitée au projet 337481 contrairement à une Project secret API key ; une fuite côté client exposerait tout le compte PostHog |
| Le dashboard PostHog interroge PostHog via HogQL (`/query/`), pas l'embed iframe PostHog ni le SDK côté navigateur | Permet des graphiques natifs recharts cohérents avec le reste du back-office, et garde la clé serveur-only |
| Aucun déploiement AWS/Terraform dans ce cycle | Hors scope explicite du contrat ; l'infra (`fronts`/`api` Terraform) reste commentée, c'est une étape manuelle séparée |
