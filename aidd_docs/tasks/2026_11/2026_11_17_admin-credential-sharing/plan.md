---
objective: "Créer un admin ne demande plus de taper un mot de passe : le serveur en génère un, et le super-admin obtient un lien à usage unique à transmettre, qui révèle les identifiants une seule fois puis se détruit — sans jamais stocker le mot de passe en clair."
status: done
---

# Plan: Partage sécurisé des identifiants d'un admin créé

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Mot de passe auto-généré à la création d'un admin, lien de partage à usage unique (chiffré, expirant à 24h, jamais de secret persistant en base), formulaire de création dans un drawer |
| **Source** | Texte (amélioration de la livraison multi-admins déjà en revue, PR #38 — décisions de périmètre déjà validées par l'utilisateur, voir conversation) |

## Phases

| #   | Phase                                                       | File                         |
| --- | ------------------------------------------------------------ | ----------------------------- |
| 1   | API : mot de passe généré, token chiffré, route de partage     | [`phase-1.md`](./phase-1.md) |
| 2   | Back-office : drawer de création, page publique de partage      | [`phase-2.md`](./phase-2.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Le mot de passe en clair ne traverse jamais la base de données, même consommé : il vit uniquement dans le token chiffré (AES-256-GCM) renvoyé à la création, jusqu'à la lecture unique côté client. La table `credential_shares` ne retient qu'un id et un `consumed_at` — rien à fuiter si elle est un jour exposée. | C'est la propriété de sécurité que le lien à usage unique est censé garantir ; la contourner en stockant le secret "temporairement" en base récréerait exactement le risque qu'on cherche à éviter. |
| Clé de chiffrement dédiée (`CREDENTIAL_SHARE_SECRET`, 32 octets exacts) plutôt que de réutiliser `JWT_SECRET`. | AES-256-GCM exige une clé de taille fixe (32 octets) alors que `JWT_SECRET` n'a qu'une contrainte de longueur minimale pour HMAC — mélanger les deux usages sous un même secret couplerait deux primitives cryptographiques différentes sans bénéfice, et une rotation de l'une forcerait une rotation de l'autre. |
| Consommation atomique via `UPDATE credential_shares SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL RETURNING id`, pas une lecture puis une écriture séparées. | Une lecture-puis-écriture permettrait à deux requêtes simultanées de lire "non consommé" toutes les deux avant que l'une n'écrive — le `WHERE consumed_at IS NULL` dans l'`UPDATE` lui-même rend la vérification et la consommation indivisibles au niveau de la ligne, sans transaction explicite à gérer. |
