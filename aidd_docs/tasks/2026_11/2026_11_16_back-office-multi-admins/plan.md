---
objective: "Le back-office supporte plusieurs administrateurs stockés en base (plus un seul couple email/mot de passe en variables d'env), avec un rôle super-admin seul habilité à créer/lister/supprimer des admins, sans jamais casser le login déjà fonctionnel en prod."
status: done
---

# Plan: Gestion multi-admins du back-office

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Remplacer l'admin unique (ADMIN_EMAIL/ADMIN_PASSWORD_HASH) par une table `admins` en base, avec création/liste/suppression réservées aux super-admins, exposées via API et une page dédiée du back-office |
| **Source** | Texte (contrat déjà cadré par l'utilisateur, décisions de périmètre validées — voir conversation) |

## Phases

| #   | Phase                                              | File                         |
| --- | --------------------------------------------------- | ----------------------------- |
| 1   | Table admins, login migré, bootstrap du super-admin  | [`phase-1.md`](./phase-1.md) |
| 2   | API de gestion des admins (super-admin only)         | [`phase-2.md`](./phase-2.md) |
| 3   | Page back-office « Administrateurs »                 | [`phase-3.md`](./phase-3.md) |
| 4   | Nettoyage des variables d'env et de la mémoire projet | [`phase-4.md`](./phase-4.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Pas de seed SQL avec le hash en dur dans la migration : la migration ne crée qu'une table vide. Le premier super-admin est inséré par un bootstrap Go, exécuté au tout début du handler de login, qui ne fait rien dès que la table contient au moins une ligne. | `infrastructure/scripts/migrate.py` exécute les fichiers `.sql` tels quels (aucun templating) : coder en dur l'email/hash réel dans un fichier versionné violerait la convention déjà en place pour stg/prd (ces valeurs ne vivent que dans des secrets GitHub, jamais dans le repo). Le bootstrap Go relit les mêmes variables d'env (ADMIN_EMAIL/ADMIN_PASSWORD_HASH) déjà posées en prod/stg/local, donc aucune credential n'a besoin d'être recréée ou re-saisie. |
| ADMIN_EMAIL/ADMIN_PASSWORD_HASH restent dans `code/api/.env.example`, mais leur rôle change : elles ne servent plus à vérifier un login (ça, c'est la table `admins`), seulement à amorcer le tout premier super-admin quand la table est vide — utile aussi bien en prod (admin déjà en place) qu'en local/stg (premier admin de dev). | Sans un minimum d'amorçage, un environnement neuf (base vide) n'aurait aucun moyen de créer son premier admin — la page de gestion elle-même exige déjà d'être connecté en super-admin pour l'utiliser. |
| Le JWT porte l'id réel de l'admin (`sub`) et un nouveau claim `is_super_admin`, plus l'email déjà présent — pas de nouvel appel DB à chaque requête protégée pour connaître le rôle. | `auth.Middleware` décode déjà le JWT sur chaque requête ; y lire le rôle est gratuit, alors qu'une requête DB par requête protégée ne le serait pas. Le compromis : un rôle changé après coup (admin promu/rétrogradé, ou supprimé) ne prend effet qu'au prochain login, pas immédiatement — acceptable pour un back-office interne. |
