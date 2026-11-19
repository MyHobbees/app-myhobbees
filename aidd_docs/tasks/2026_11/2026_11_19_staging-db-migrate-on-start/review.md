# Review: Migrations stg déclenchées au démarrage de la base

- **Verdict**: approve
- **Diff**: `origin/dev...feat/staging-db-migrate-on-start` (`029b4894`, `0b451322`, `6814da68`, `aff8ff02`)
- **Axes run**: code, functional, relevancy
- **Date**: 2026_11_19
- **Findings**: 0 critical, 0 warning, 3 minor

## Phases

### Phase 1 — API + infra : déclenchement GitHub Actions, workflow dédié

- [x] `go test ./internal/githubactions/...` couvre succès, échec HTTP, et confirme le comportement 2xx réel (pas supposé) de l'API GitHub dispatch — `githubactions_test.go:23,51,66,78`, 4/4 PASS ; 204 par défaut / 200 sur `return_run_details` confirmé contre le changelog GitHub du 2026-02-19, le commentaire `githubactions.go:29-32` est exact
- [x] `go test ./internal/routes/... -run Staging_Migrate` couvre les 3 scénarios ; aucun token ni corps de réponse GitHub ne fuit — 3/3 PASS ; `staging_test.go:184-190` assert explicitement l'absence de fuite du corps GitHub et du token
- [x] Le nouveau fichier workflow est syntaxiquement valide et ne référence que des secrets `TF_STG__*` ; `ci-cd.yml` ne contient plus `migrate-database-stg` — `yaml.safe_load` passe, clés top-level `name`/`on`/`concurrency`/`jobs` ; 3 secrets, tous `TF_STG__*`, zéro `TF_PRD__*`, zéro secret tfstate AWS ; aucun `needs:` restant ne cite le job retiré
- [x] `terraform validate` passe pour `api` (stg et prd) avec la nouvelle variable — rejoué sur copie isolée (`~/.tfenv/versions/1.15.6/terraform`) : `Success!` pour les deux ; inchangé par `6814da68`/`aff8ff02`
- [x] `go vet ./...` et `go test ./...` passent sur tout `code/api` — `go vet` sans sortie, 7 paquets `ok` en `-count=1`

### Phase 2 — Back-office : auto-déclenchement après démarrage, mémoire

- [x] `npm run build`/typecheck ne signale aucune erreur sur le nouveau type/fonction — `npm run build` ✓ built in 335ms ; `api.ts:354-356`
- [x] Test Vitest : démarrer, observer la transition de statut, voir la migration se déclencher automatiquement une seule fois — `staging-db.test.tsx:31-77` ; edge cases couverts : échec de migration (`:79`), démontage en pleine sonde (`:111`), rejet de la sonde (`:140`), déjà disponible au montage (`:179`)
- [x] `npm run lint`, `npm run test`, `npm run build` verts ; aucune mémoire ne décrit plus l'ancien comportement comme actif — lint : 4 warnings pré-existants sur `components/ui/*`, aucun sur les fichiers touchés ; 23/23 tests ; `api.md:17`, `database.md:17`, `deployment.md:13,18-19`, `infra.md:34-37` décrivent tous le nouveau flux

## Findings

| Sev | Kind | Phase | Location | Issue | Fix |
| --- | ---- | ----- | -------- | ----- | --- |
| 🟢 | code | 2 | `code/www-back-office/src/pages/staging-db.test.tsx:140` | Le test s'appelle « abandons the probe and shows an error when a poll tick rejects **persistently** » mais ne pose qu'un `mockRejectedValueOnce` : il vérifie l'abandon dès le **premier** rejet. Le comportement testé est le bon (`getStagingStatus` n'échoue que sur `UnauthorizedError`, `api.ts:342` — une condition définitive, jamais transitoire), c'est le nom qui promet autre chose. | Renommer en « abandons the probe on the first rejection (session expiry) ». Aucun changement de comportement. |
| 🟢 | fit | 1 | `aidd_docs/memory/infra.md:37` | Le modèle de menace dit « rerun any past run … re-applying prd Terraform or redeploying prd code » sans nommer l'angle le plus vicieux : rejouer un run **ancien** fait un checkout de l'ancien commit, donc `terraform apply --auto-approve` ferait *régresser* l'infra prd vers une définition antérieure, pas seulement rejouer l'état courant. Directionnellement couvert, pas nommé. | Une incise : « y compris un run ancien, dont le rerun ramènerait l'infra prd à la définition de ce commit-là ». |
| 🟢 | fit | 1 | `aidd_docs/memory/infra.md:37` | Les mitigations listent « rotate periodically », mais pas la plus structurelle : une **expiration courte** sur le PAT fine-grained, qui borne la fenêtre d'exposition sans dépendre de se souvenir de tourner le token. | Ajouter l'expiration courte à la liste des mitigations, à côté de la rotation. |
| 🟢 | code | 1 | `infrastructure/scripts/terraform.py:94,99` | Le token passe à Terraform sur la ligne de commande (`-var='…'` via `os.system`), donc visible dans la table des processus du runner pendant l'apply. **Délibérément laissé ouvert** : pattern pré-existant appliqué à TOUS les secrets du script (`db_password`, `jwt_secret`, …), ce diff en ajoute un de plus sans l'introduire ; le corriger impliquerait de revoir la gestion de secrets de tout le script. | Hors périmètre, arbitrage validé. À traiter globalement (`TF_VAR_*` en variables d'environnement) si l'exposition devient un sujet. Non compté dans le total ci-dessus. |

## Verification

| Metric        | Value                                             |
| ------------- | ------------------------------------------------- |
| Verified      | 100% (8/8)                                        |
| Files checked | `.github/workflows/ci-cd.yml`, `.github/workflows/migrate-stg-on-demand.yml`, `code/api/internal/githubactions/githubactions.go`, `code/api/internal/githubactions/githubactions_test.go`, `code/api/internal/routes/staging.go`, `code/api/internal/routes/staging_test.go`, `code/api/internal/app/app.go`, `code/www-back-office/src/lib/api.ts`, `code/www-back-office/src/pages/staging-db.tsx`, `code/www-back-office/src/pages/staging-db.test.tsx`, `environments/stg/variables.stg.tf`, `environments/prd/variables.prd.tf`, `infrastructure/terraform/api/lambda.tf`, `infrastructure/scripts/terraform.py`, `infrastructure/scripts/migrate.py`, `aidd_docs/memory/{api,database,deployment,infra}.md` |
| Unchecked     | none                                              |
| Unplanned     | `aidd_docs/memory/database.md:17` et `api.md:17` mis à jour alors que la projection de phase-2 ne nommait qu'`infra.md` et `deployment.md` — ajouts cohérents, `api.md` renvoie à `infra.md` sans dupliquer ; `MAX_POLL_ATTEMPTS` (`staging-db.tsx:31`) explicitement autorisé comme optionnel par la tâche 2.4 ; `concurrency:` sur le workflow et le modèle de menace d'`infra.md:36-37` sont issus de la revue précédente, pas du plan |
