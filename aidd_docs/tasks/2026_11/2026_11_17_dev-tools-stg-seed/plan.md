---
objective: "La page « Outils dev » du back-office n'existe plus que sur stg et y sert à peupler/nettoyer la table leads directement en base, sans plus jamais appeler Shopify."
status: done
---

# Plan: Outils dev stg-only, seed de la DB sans Shopify

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Retirer le seed Shopify (produits/clients/commandes) de « Outils dev », le remplacer par un seed/cleanup de la table `leads`, et restreindre toute la fonctionnalité à l'environnement stg |
| **Source** | Texte (décision de périmètre déjà validée par l'utilisateur : remplacer, pas coexister — voir conversation) |

## Phases

| #   | Phase                                              | File                         |
| --- | --------------------------------------------------- | ----------------------------- |
| 1   | API : retrait du seed Shopify, seed/cleanup leads stg-only | [`phase-1.md`](./phase-1.md) |
| 2   | Back-office : détection d'environnement, page Outils dev | [`phase-2.md`](./phase-2.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| « stg uniquement » veut dire exactement ça, pas « sauf prod » : la garde serveur compare `APP_ENV` à `"stg"` (égalité), pas `!= "prd"`. `loc` est aussi bloqué. | Demande explicite de l'utilisateur. Un développeur qui teste en local peuple sa propre base directement (psql, comme fait plusieurs fois dans cette session) ; ce bouton sert à peupler stg, le seul environnement partagé qu'on ne peut pas `psql` facilement. |
| Les leads de seed sont reconnaissables par un motif d'email dédié (`seed-<n>@example.test`), pas par une colonne supplémentaire sur `leads`. | Pas de migration nécessaire, et le nettoyage cible exactement ce qui a été semé (`WHERE email LIKE 'seed-%@example.test'`) sans jamais risquer de toucher une vraie inscription — une vraie adresse ne peut pas matcher ce domaine réservé aux tests (RFC 2606). |
| L'environnement est lu côté front via un appel à `GET /health` (déjà public, déjà renvoie `env`), pas via une nouvelle variable d'env Vite. | `/health` existe déjà et porte déjà cette information exacte ; dupliquer la notion d'environnement dans une variable de build serait une deuxième source de vérité qui peut diverger du serveur réellement interrogé. |
