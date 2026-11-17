// Package jwt signs and verifies the API's own HS256 JSON Web Tokens.
package jwt

import (
	"errors"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

// Claims is the payload carried by an access token.
type Claims struct {
	Email        string `json:"email,omitempty"`
	IsSuperAdmin bool   `json:"isSuperAdmin,omitempty"`
	jwtlib.RegisteredClaims
}

// ErrInvalidToken is returned when a token fails verification.
var ErrInvalidToken = errors.New("invalid token")

// Sign issues a signed token for the given subject, email and role, valid for ttl.
func Sign(secret, subject, email string, isSuperAdmin bool, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		Email:        email,
		IsSuperAdmin: isSuperAdmin,
		RegisteredClaims: jwtlib.RegisteredClaims{
			Subject:   subject,
			IssuedAt:  jwtlib.NewNumericDate(now),
			ExpiresAt: jwtlib.NewNumericDate(now.Add(ttl)),
		},
	}
	return jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims).SignedString([]byte(secret))
}

// Verify parses and validates a token, returning its claims.
func Verify(secret, token string) (*Claims, error) {
	claims := &Claims{}
	parsed, err := jwtlib.ParseWithClaims(token, claims, func(t *jwtlib.Token) (any, error) {
		if _, ok := t.Method.(*jwtlib.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil || !parsed.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
