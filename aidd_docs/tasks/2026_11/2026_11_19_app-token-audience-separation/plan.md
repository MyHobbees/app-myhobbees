---
objective: "An app user's JWT (aud=app) can never pass auth.Middleware (admin routes), and an admin's JWT (aud=backoffice) can never pass the new auth.AppMiddleware (/v1/app/*); a token with no aud is rejected by both."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: App/admin token audience separation

## Overview

| Field      | Value                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| **Goal**   | Give every signed JWT an explicit `aud` (`backoffice` or `app`) and make each middleware accept only its own audience, so an app-user token can never reach an admin route and vice versa. |
| **Source** | GitHub issue [#61](https://github.com/MyHobbees/app-myhobbees/issues/61) |

## Phases

| #   | Phase                                  | File                         |
| --- | --------------------------------------- | ---------------------------- |
| 1   | JWT audience claim + AppMiddleware + /v1/app mount | [`phase-1.md`](./phase-1.md) |

## Resources

| Source                                                                            | Verified                                                                                                     |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `golang-jwt/jwt/v5` `parser_option.go` (vendored source, v5.2.1, already a direct dependency) | `jwt.WithAudience(aud)` parser option rejects both a mismatched `aud` and a missing `aud` claim — exactly the two rejection cases the ticket requires, no manual claim comparison needed |

## Decisions

| Decision                                                                                   | Why                                                                                                                                                       |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse `jwtlib.RegisteredClaims.Audience` (already embedded in `jwt.Claims`) instead of adding a custom field | It is already wired through `golang-jwt`'s own validator (`jwt.WithAudience`); a second, parallel audience field would invite the two to disagree |
| `jwt.Sign` and `jwt.Verify` both take an explicit `audience string` parameter rather than gaining an `App`-suffixed sibling | Matches the ticket's own wording ("add an aud claim to jwt.Sign/jwt.Verify") and forces every existing call site to state its audience deliberately, instead of defaulting one audience implicitly |
| `/v1/app/*` gets one placeholder route (`GET /v1/app/me`, mirroring `routes.Example()`'s `/me`) in this ticket | The acceptance criteria require a real route to assert 401/200 against; the actual app-user endpoints are out of scope here (ticket says this must merge before #62, which presumably builds them) |
