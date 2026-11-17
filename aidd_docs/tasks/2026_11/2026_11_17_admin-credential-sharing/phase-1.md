---
status: done
---

# Instruction: API : mot de passe généré, token chiffré, route de partage

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
code/database/migrations
└── 003_create_credential_shares.sql   ✅ table credential_shares (id, created_at, consumed_at) — jamais de secret dedans

code/api/internal/credentialshare
├── credentialshare.go                  ✅ Seal/Open : AES-256-GCM, payload {email, password, shareId, exp}, base64url
└── credentialshare_test.go             ✅ round-trip, falsifié, clé fausse, expiré

code/api/internal/auth
├── auth.go                             ✏️ ValidateShareSecret(secret) : exactement 32 octets
└── auth_test.go                        ✏️ tests de ValidateShareSecret

code/api/internal/routes
├── admins.go                           ✏️ POST / : retire password de l'input, génère un mot de passe fort, crée la ligne credential_shares, scelle le token, répond {admin, shareToken}
├── credential_shares.go                ✅ GET /{token} : ouvre le token, consomme atomiquement, répond {email, password} une fois ou 404
└── credential_shares_test.go           ✅ succès, déjà consommé, expiré, token invalide, double lecture simultanée

code/api/internal/app
└── app.go                              ✏️ monte GET /v1/credential-shares/{token} hors du groupe protégé, à côté de /auth et POST /leads

code/api/cmd/api
└── main.go                             ✏️ valide aussi CREDENTIAL_SHARE_SECRET au démarrage, refuse de démarrer sinon

code/api
└── .env.example                        ✏️ ajoute CREDENTIAL_SHARE_SECRET (commentaire : 32 octets exacts)
```

## User Journey

```mermaid
flowchart TD
  A[POST /v1/admins] --> B[Génère un mot de passe fort aléatoire]
  B --> C[bcrypt, insert dans admins]
  C --> D[insert dans credential_shares, non consommé]
  D --> E[Seal(email, password, shareId, exp=+24h) -> token]
  E --> F[Réponse: admin créé + shareToken, jamais le mot de passe en clair]
  G[GET /v1/credential-shares/:token] --> H{Open(token) valide et non expiré ?}
  H -- non --> I[404]
  H -- oui --> J[UPDATE credential_shares SET consumed_at=NOW WHERE id=shareId AND consumed_at IS NULL]
  J -- 0 ligne affectée --> I
  J -- 1 ligne affectée --> K[200: email + password en clair, une seule fois]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    DB de test avec la migration 003 appliquée, 1 super-admin => prêt: 5: system
  section Happy path - création puis consultation
    POST /v1/admins (email seul, pas de password) => 201 avec shareToken ; GET /v1/credential-shares/:token => 200 email+password, password valide 12+ caractères variés: 5: api
  section Edge case - double consultation
    Rappeler GET sur le même token juste après un succès => 404: 1: api
  section Edge case - lecture simultanée
    2 requêtes GET concurrentes sur le même token fraîchement créé => exactement une reçoit 200, l'autre 404, jamais les deux à 200: 1: api
  section Edge case - token expiré
    Token scellé avec exp dans le passé => GET => 404, jamais un 500: 1: api
  section Edge case - token falsifié
    Token modifié d'un caractère (signature GCM invalide) ou signé avec une autre clé => GET => 404: 1: api
  section Edge case - démarrage sans CREDENTIAL_SHARE_SECRET
    Variable absente ou de mauvaise taille => le process refuse de démarrer (comme JWT_SECRET aujourd'hui), jamais un démarrage silencieux avec un chiffrement cassé: 1: system
  section Edge case - input POST /v1/admins avec un champ password
    Body contenant encore un champ "password" => ignoré silencieusement (ou rejeté explicitement, au choix de l'exécutant, mais jamais utilisé comme mot de passe réel): 1: api
```

## Tasks to do

### `1)` Migration SQL

1. `code/database/migrations/003_create_credential_shares.sql` :
   ```sql
   CREATE TABLE credential_shares (
       id          SERIAL PRIMARY KEY,
       created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       consumed_at TIMESTAMPTZ
   );
   ```

### `2)` Package credentialshare

> Chiffrement authentifié, indépendant du JWT. `code/api/internal/credentialshare/credentialshare.go`.

1. `type Payload struct { Email string; Password string; ShareID int64; Exp int64 }`.
2. `Seal(secret string, payload Payload) (string, error)` : sérialise en JSON, chiffre avec `crypto/aes` + `crypto/cipher.NewGCM`, nonce aléatoire (`crypto/rand`) préfixé au ciphertext, encode le tout en base64 URL-safe sans padding (`base64.RawURLEncoding`) pour que le token soit directement utilisable dans un chemin d'URL.
3. `Open(secret, token string) (*Payload, error)` : décode, déchiffre (échec = signature invalide ou clé fausse -> erreur générique), désérialise, vérifie `Exp` contre `time.Now().Unix()` -> expiré = erreur générique. Une seule erreur exportée (ex. `ErrInvalidOrExpired`) pour ne jamais distinguer les cas côté appelant.
4. Tests : round-trip exact ; falsifier un caractère du token -> erreur ; mauvaise clé -> erreur ; `Exp` dans le passé -> erreur.

### `3)` ValidateShareSecret

> `code/api/internal/auth/auth.go`, à côté de `ValidateSecret`.

1. `func ValidateShareSecret(secret string) error` : `len(secret) != 32` -> erreur explicite ("CREDENTIAL_SHARE_SECRET must be exactly 32 bytes for AES-256, got %d"). Pas de minimum comme `JWT_SECRET`, une taille exacte.
2. Tests : 32 octets -> nil ; 31 ou 33 -> erreur ; vide -> erreur.

### `4)` Génération du mot de passe et POST /v1/admins

> `code/api/internal/routes/admins.go`.

1. `generateStrongPassword() (string, error)` : `crypto/rand`, 20 caractères, charset large (majuscules, minuscules, chiffres, symboles courants — éviter les caractères ambigus genre `0`/`O`/`l`/`1` si simple à faire, sinon charset complet, au choix).
2. Retirer `Password` de `createAdminBody` (ou le laisser présent dans le type mais ne jamais le lire/utiliser — au choix de l'exécutant, tant qu'un password soumis n'a aucun effet).
3. Après l'insert de l'admin (bcrypt du mot de passe généré, pas d'un mot de passe client) : `INSERT INTO credential_shares DEFAULT VALUES RETURNING id`, puis `credentialshare.Seal(os.Getenv("CREDENTIAL_SHARE_SECRET"), Payload{Email: admin.Email, Password: generatedPassword, ShareID: shareID, Exp: time.Now().Add(24*time.Hour).Unix()})`.
4. Réponse `201` : `{"admin": {...sans password_hash...}, "shareToken": "..."}`. Ne jamais inclure le mot de passe en clair dans cette réponse ni dans un log (`log.Printf` sur une erreur de scellement du token ne doit jamais interpoler le mot de passe généré).

### `5)` Route de consultation du partage

> `code/api/internal/routes/credential_shares.go`, montée en dehors du groupe protégé.

1. `GET /{token}` : `chi.URLParam(req, "token")`, `credentialshare.Open(secret, token)` -> erreur -> `httpjson.Error(w, 404, "Not found")`.
2. Succès : `pool.Exec(ctx, "UPDATE credential_shares SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL", payload.ShareID)` puis vérifier `result.RowsAffected()` -> `0` -> `404` (déjà consommé) ; `1` -> `httpjson.OK(w, 200, map[string]string{"email": payload.Email, "password": payload.Password})`.
3. `code/api/internal/app/app.go` : monter `r.Get("/credential-shares/{token}", routes.GetCredentialShare)` dans la section publique, au même niveau que `r.Mount("/auth", ...)` et `r.Post("/leads", ...)`.
4. Tests : succès (200 une fois) ; rappel immédiat (404) ; expiré (404) ; falsifié (404) ; deux goroutines concurrentes sur le même token fraîchement créé -> exactement un 200.

### `6)` Validation au démarrage

1. `code/api/cmd/api/main.go` : après la validation de `JWT_SECRET`, ajouter `auth.ValidateShareSecret(os.Getenv("CREDENTIAL_SHARE_SECRET"))`, même traitement (`log.Fatalf`).
2. `code/api/.env.example` : ajouter `CREDENTIAL_SHARE_SECRET=` avec un commentaire précisant "exactement 32 octets, ex. `openssl rand -base64 24 | cut -c1-32`".

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | -------------------- |
| 1... | La migration s'applique sans erreur sur une base migrée jusqu'à 002 |
| 2... | `go test ./internal/credentialshare/...` couvre round-trip, falsification, mauvaise clé, expiration |
| 3... | `go test ./internal/auth/... -run ShareSecret` couvre les tailles valides/invalides |
| 4... | `curl -X POST .../v1/admins` avec un JWT super-admin et `{"email":"x@y.fr"}` (sans password) répond 201 avec un `shareToken`, jamais un mot de passe en clair dans la réponse |
| 5... | `go test ./internal/routes/... -run CredentialShare` couvre les 7 scénarios du Test Scope, y compris la lecture concurrente |
| 6... | Démarrer l'API sans `CREDENTIAL_SHARE_SECRET` (ou avec une mauvaise taille) échoue immédiatement, message explicite |
| — | `go vet ./...` et `go test ./...` passent sur tout `code/api` |
