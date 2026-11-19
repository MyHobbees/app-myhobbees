package auth

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/jwt"
)

type ctxKey string

const principalKey ctxKey = "principal"
const appPrincipalKey ctxKey = "appPrincipal"

// MinSecretBytes is the minimum acceptable length for JWT_SECRET. An empty
// or short secret turns HS256 signing/verification into a trivially forgeable
// scheme, so anything below this threshold must never be trusted.
const MinSecretBytes = 32

type Principal struct {
	Subject      string
	Email        string
	IsSuperAdmin bool
}

// AppPrincipal is the identity carried by an app-user JWT (aud=app), kept
// separate from Principal so an app-user token can never be mistaken for an
// admin Principal.
type AppPrincipal struct {
	UserID string
	Email  string
}

// ValidateSecret returns an error when secret is too weak (empty, missing,
// or shorter than MinSecretBytes) to safely sign or verify tokens.
func ValidateSecret(secret string) error {
	if len(secret) < MinSecretBytes {
		return fmt.Errorf("JWT_SECRET must be set and at least %d bytes long, got %d", MinSecretBytes, len(secret))
	}
	return nil
}

// ShareSecretBytes is the exact length CREDENTIAL_SHARE_SECRET must have:
// AES-256-GCM requires a 32-byte key, not merely a minimum like JWT_SECRET's
// HMAC key.
const ShareSecretBytes = 32

// ValidateShareSecret returns an error unless secret is exactly
// ShareSecretBytes long. Unlike ValidateSecret, there is no "at least" here:
// crypto/aes.NewCipher rejects any other length outright, so a wrong-sized
// secret must be caught before it ever reaches credentialshare.Seal/Open.
func ValidateShareSecret(secret string) error {
	if len(secret) != ShareSecretBytes {
		return fmt.Errorf("CREDENTIAL_SHARE_SECRET must be exactly %d bytes for AES-256, got %d", ShareSecretBytes, len(secret))
	}
	return nil
}

func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		secret, token, ok := validatedBearerToken(w, r)
		if !ok {
			return
		}

		claims, err := jwt.Verify(secret, token, jwt.AudienceBackoffice)
		if err != nil {
			httpjson.Error(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		principal := Principal{Subject: claims.Subject, Email: claims.Email, IsSuperAdmin: claims.IsSuperAdmin}
		next.ServeHTTP(w, r.WithContext(
			context.WithValue(r.Context(), principalKey, principal),
		))
	})
}

func PrincipalFrom(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey).(Principal)
	return p, ok
}

// AppMiddleware authenticates an app-user request (aud=app), the sibling
// of Middleware for /v1/app/* routes. A token that passes Middleware
// (aud=backoffice) is rejected here, and vice versa.
func AppMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		secret, token, ok := validatedBearerToken(w, r)
		if !ok {
			return
		}

		claims, err := jwt.Verify(secret, token, jwt.AudienceApp)
		if err != nil {
			httpjson.Error(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		principal := AppPrincipal{UserID: claims.Subject, Email: claims.Email}
		next.ServeHTTP(w, r.WithContext(
			context.WithValue(r.Context(), appPrincipalKey, principal),
		))
	})
}

func AppPrincipalFrom(ctx context.Context) (AppPrincipal, bool) {
	p, ok := ctx.Value(appPrincipalKey).(AppPrincipal)
	return p, ok
}

// validatedBearerToken checks JWT_SECRET's strength and extracts the Bearer
// token from the request, writing the appropriate 401 itself when either
// step fails. The bool return reports whether the caller should proceed.
func validatedBearerToken(w http.ResponseWriter, r *http.Request) (secret, token string, ok bool) {
	secret = os.Getenv("JWT_SECRET")
	if err := ValidateSecret(secret); err != nil {
		// Defense in depth: even if a deployment skipped the boot-time
		// check, never let a weak/empty secret validate any token.
		httpjson.Error(w, http.StatusUnauthorized, "Server misconfigured")
		return "", "", false
	}

	token, ok = strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok {
		httpjson.Error(w, http.StatusUnauthorized, "Missing bearer token")
		return "", "", false
	}
	return secret, token, true
}

// RequireSuperAdmin must run after Middleware (which populates the
// Principal from the JWT): it rejects any request whose principal is
// missing or is not a super-admin, before the route's own handler runs.
func RequireSuperAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		principal, ok := PrincipalFrom(r.Context())
		if !ok || !principal.IsSuperAdmin {
			httpjson.Error(w, http.StatusForbidden, "Forbidden")
			return
		}
		next.ServeHTTP(w, r)
	})
}
