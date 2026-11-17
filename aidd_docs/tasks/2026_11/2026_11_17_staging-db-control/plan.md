---
objective: "An admin can start the stopped stg RDS instance from the prd back-office with IAM access scoped to that one instance, and the instance auto-stops after 30 minutes without a connection."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Staging DB control from the prd back-office

## Overview

| Field      | Value                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Goal**   | Let an admin start `myhobbees-stg-database` from the prd back-office (saving ~8-13$/month of idle RDS time), with cross-env IAM scoped to exactly that one instance, and an automatic 30-minute-idle stop so nobody has to remember to turn it back off. |
| **Source** | Text (user request, validated across the conversation that preceded this plan) |

## Phases

| #   | Phase                        | File                         |
| --- | ---------------------------- | ---------------------------- |
| 1   | Go API: staging DB control   | [`phase-1.md`](./phase-1.md) |
| 2   | Terraform: IAM + auto-stop Lambda | [`phase-2.md`](./phase-2.md) |
| 3   | Back-office: staging DB page | [`phase-3.md`](./phase-3.md) |

## Resources

<!-- External sources only (URLs, docs), not code files. Omit if none consulted. -->

| Source                                                                 | Verified                                                                                   |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| AWS RDS docs (via earlier web research in this conversation)            | `StopDBInstance` preserves EBS storage (no data loss); a stopped instance auto-restarts after 7 consecutive days |

## Decisions

<!-- Architecture-magnitude only, one you'd regret reversing. Omit if none qualify. -->

| Decision                                                                                   | Why                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grant the prd Lambda's own IAM role a scoped cross-env permission (3 actions, 1 instance ARN) instead of exposing `TF_STG__*` credentials to prd | The project otherwise keeps stg/prd strictly isolated (separate credentials, separate Terraform state); this is a deliberate, narrow, documented exception — user-requested and confirmed after the tradeoff was surfaced twice |
| The 30-minute auto-stop Lambda lives in the `database` module, gated to `stg` only, with its own IAM role scoped to its own instance | Keeps the automatic safety net inside stg's own boundary — prd only ever *starts* stg, it never owns the stop logic |
| No `DeleteDBInstance` call anywhere in this feature | Stopping must never risk data loss; only `Start`/`Stop`/`Describe` exist in the new client |
