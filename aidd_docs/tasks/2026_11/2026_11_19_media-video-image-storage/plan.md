---
objective: "Les buckets S3 video (privé, URLs signées CloudFront) et images (public, CloudFront uniquement) existent en Terraform stg+prd, avec le wiring de secrets/variables existant, le rôle IAM Lambda mis à jour, et l'API Go capable de générer une URL de PUT pré-signée et une URL vidéo signée CloudFront."
status: implemented
---

# Plan: Stockage et diffusion des vidéos et images (S3 + CloudFront) — ticket #66

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Provisionner les buckets vidéo (privé, signé) et images (public via CloudFront) et exposer depuis l'API Go la génération d'URLs pré-signées d'upload et d'URLs vidéo signées |
| **Source** | Ticket GitHub #66 — https://github.com/MyHobbees/app-myhobbees/issues/66 |

## Phases

| #   | Phase                              | File                         |
| --- | ------------------------------------ | ----------------------------- |
| 1   | Infra Terraform (buckets, CloudFront, IAM, secrets) | [`phase-1.md`](./phase-1.md) |
| 2   | API Go (presign upload, URL vidéo signée)           | [`phase-2.md`](./phase-2.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| `infrastructure/scripts/terraform.py` (lu en local) | Mécanisme `SERVICE_SECRETS`/`OPTIONAL_SECRETS` : clé manquante et non optionnelle → `exit(-1)` avec le message `Missing environment variable: TF_{ENV}__{SECRET}` avant tout apply |
| `code/api/internal/shopify/client.go`, `internal/awsrds/client.go` (lus en local) | Pattern `FromEnv()` existant : retourne `ErrNotConfigured` si une env var requise est vide, `config.LoadDefaultConfig(ctx)` pour hériter du rôle IAM de la Lambda (aws-sdk-go-v2) |
| `infrastructure/terraform/fronts/s3_assets.tf`, `s3_back-office.tf`, `providers.tf` (lus en local) | Convention bucket public : `aws_s3_bucket_acl` + `aws_s3_bucket_policy` public-read ; convention domaine cross-module : `asset_endpoint`/`back_office_endpoint`/`app_endpoint` sont des variables à défaut littéral, renseignées à la main après le premier apply (pas de data source remote-state entre modules) |
| `infrastructure/terraform/api/lambda.tf`, `iam_staging_control.tf` (lus en local) | Convention : les ARN d'une ressource d'un autre module/state sont codés en dur par construction du nom (`${var.app}-${var.env}-...`), jamais via remote-state |

## Decisions

| Decision | Why |
| -------- | --- |
| Signature des URLs CloudFront codée à la main (stdlib `crypto/rsa` + `crypto/sha1`, politique "canned") plutôt que `github.com/aws/aws-sdk-go/service/cloudfront/sign` (SDK v1). | Le projet n'utilise que `aws-sdk-go-v2`, qui n'a pas d'équivalent ; ajouter le SDK v1 entier pour une seule fonction de signature RSA-SHA1 (déjà disponible en stdlib) alourdit les dépendances sans bénéfice. |
| Noms de buckets (`MEDIA_VIDEO_BUCKET`/`MEDIA_IMAGE_BUCKET`) calculés par interpolation `${var.app}-${var.env}-video`/`-images`, directement dans `lambda.tf`, sans nouvelle variable Terraform. | Déterministe et sans dépendance cross-module, exactement comme `DB_NAME` l'est déjà dans `lambda.tf`. |
| Domaines CDN (`MEDIA_VIDEO_CDN_DOMAIN`/`MEDIA_IMAGE_CDN_DOMAIN`) en nouvelles variables à défaut vide, renseignées à la main après le premier apply du module `fronts`. | Le nom de domaine CloudFront est assigné par AWS à la création ; ce repo n'a pas de data source remote-state entre modules (`fronts` et `api` ont des states séparés) — même convention que `asset_endpoint`/`back_office_endpoint`/`app_endpoint`. |
| `cloudfront_video_key_id` ajouté à `OPTIONAL_SECRETS` pour `api` (stg et prd), défaut vide. `cloudfront_video_private_key` (api) et `cloudfront_video_public_key` (nouvelle clé `fronts` dans `SERVICE_SECRETS`) restent requis (non optionnels). | L'ID de clé publique CloudFront est assigné par AWS à la création de `aws_cloudfront_public_key` (module `fronts`) — il ne peut pas exister avant le premier apply de ce module, donc l'exiger dès ce merge ferait échouer le tout premier `deploy-api` qui suit, sans qu'aucune configuration préalable n'ait pu l'éviter. La paire de clés RSA (publique/privée), elle, peut être générée par l'opérateur avant le merge, indépendamment de l'ordre d'apply — c'est elle qui doit prouver le critère d'acceptation "secret media manquant → échec rapide". |
| Aucun `terraform apply`/`plan` réel exécuté (pas de credentials AWS dans cet environnement) ; seuls `terraform validate`/`fmt -check` et les tests Go unitaires valident le travail. Les critères d'acceptation HTTP réels (403 sans signature, lecture avant expiration, échec après expiration, déploiement stg) ne sont pas vérifiables ici. | Même limitation déjà rencontrée et documentée explicitement sur `2026_11_18_back-office-custom-domain` plutôt que de prétendre un apply réussi. |
| Deux nouveaux endpoints protégés `/v1/media` (`POST /presign-upload`, `GET /video-url`) exposés dans l'API Go. | Les critères d'acceptation ("une URL pré-signée PUT", "une URL signée par l'API") supposent que l'API expose une capacité à les produire ; rien dans la description du ticket ne le dit explicitement mais aucune autre partie du système ne peut les générer. |
