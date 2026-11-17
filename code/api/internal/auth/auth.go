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

// MinSecretBytes is the minimum acceptable length for JWT_SECRET. An empty
// or short secret turns HS256 signing/verification into a trivially forgeable
// scheme, so anything below this threshold must never be trusted.
const MinSecretBytes = 32

type Principal struct {
	Subject      string
	Email        string
	IsSuperAdmin bool
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
		secret := os.Getenv("JWT_SECRET")
		if err := ValidateSecret(secret); err != nil {
			// Defense in depth: even if a deployment skipped the boot-time
			// check, never let a weak/empty secret validate any token.
			httpjson.Error(w, http.StatusUnauthorized, "Server misconfigured")
			return
		}

		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok {
			httpjson.Error(w, http.StatusUnauthorized, "Missing bearer token")
			return
		}

		claims, err := jwt.Verify(secret, token)
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
