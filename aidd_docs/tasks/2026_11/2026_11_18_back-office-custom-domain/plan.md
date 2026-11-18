---
objective: "Un certificat ACM valide pour back-office.myhobbees.fr (prd) et back-office-stg.myhobbees.fr (stg) est demandé en us-east-1, prêt à être validé dès que les enregistrements DNS fournis sont posés chez OVH."
status: done
---

# Plan: Domaine custom OVH pour le back-office (étape 1/2 : certificats ACM)

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Demander les certificats ACM DNS-validés pour les deux domaines, sans toucher au CloudFront existant | 
| **Source** | Texte (domaines fournis par l'utilisateur : `back-office.myhobbees.fr` prd, `back-office-stg.myhobbees.fr` stg ; DNS géré chez OVH, aucun accès OVH disponible depuis cet environnement) |

## Phases

| #   | Phase                                      | File                         |
| --- | -------------------------------------------- | ----------------------------- |
| 1   | Demande des certificats ACM (sans câblage CloudFront) | [`phase-1.md`](./phase-1.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Livraison scindée en 2 PR distinctes : celle-ci ne demande QUE les certificats ACM (validation DNS) ; une deuxième PR, après confirmation que les enregistrements DNS sont posés chez OVH et validés, câblera `aliases`/`viewer_certificate` sur `aws_cloudfront_distribution.BackOffice` et ajoutera `aws_acm_certificate_validation`. | Écrire les deux en une seule fois ferait que le prochain `terraform apply fronts stg/prd` en CI tenterait `aws_acm_certificate_validation` avant que les CNAME OVH n'existent — cette ressource attend la validation DNS (jusqu'à ~45 min) puis échoue, bloquant tout le pipeline stg ET prd (via les jobs `needs` en aval) jusqu'à résolution manuelle. Scinder évite de risquer un 3e incident de pipeline sur ce projet après les deux déjà survenus aujourd'hui. |
| Certificat demandé via un provider AWS alias dédié en `us-east-1`, pas la région `eu-west-3` déjà utilisée par le reste de l'infra. | Contrainte AWS non négociable : CloudFront n'accepte un certificat ACM que s'il a été émis dans `us-east-1`, quelle que soit la région du reste des ressources. |
| Deux ressources de certificat distinctes (une par environnement), chacune dans le state terraform `fronts` de son propre environnement (stg/prd), pas un seul certificat SAN partagé. | Cohérent avec le fait que stg et prd ont déjà des states/credentials AWS entièrement séparés (`TF_STG__*`/`TF_PRD__*`) ; un certificat partagé entre les deux introduirait une dépendance croisée inutile. |
