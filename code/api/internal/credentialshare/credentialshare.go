// Package credentialshare seals/opens the one-time credential-share token:
// an AES-256-GCM-encrypted, base64url-encoded blob carrying a freshly
// generated admin's email and plaintext password so it can be handed to the
// super-admin as a link, without that plaintext password ever touching the
// database (see aidd_docs/tasks/.../phase-1.md Decisions).
package credentialshare

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"time"
)

// ErrInvalidOrExpired is the single error Open ever returns: a falsified
// token, a token sealed with a different secret, and an expired token are
// deliberately indistinguishable to the caller, so the HTTP layer can never
// leak which one applies.
var ErrInvalidOrExpired = errors.New("credentialshare: invalid or expired token")

// Payload is the plaintext carried inside the sealed token.
type Payload struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	ShareID  int64  `json:"shareId"`
	Exp      int64  `json:"exp"`
}

// Seal encrypts payload with secret (must be exactly 32 bytes, see
// auth.ValidateShareSecret) and returns a base64url (no padding) token
// safe to embed directly in a URL path.
func Seal(secret string, payload Payload) (string, error) {
	block, err := aes.NewCipher([]byte(secret))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	plaintext, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	// Seal appends the ciphertext to its first argument: passing nonce
	// there prefixes it to the ciphertext, so Open only needs the token
	// itself (no separate nonce to carry).
	sealed := gcm.Seal(nonce, nonce, plaintext, nil)
	return base64.RawURLEncoding.EncodeToString(sealed), nil
}

// Open decrypts and validates token against secret. Any failure — bad
// base64, wrong secret, tampered ciphertext, or an expired Exp — collapses
// to ErrInvalidOrExpired so callers never need (or get) finer detail.
func Open(secret, token string) (*Payload, error) {
	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return nil, ErrInvalidOrExpired
	}

	block, err := aes.NewCipher([]byte(secret))
	if err != nil {
		return nil, ErrInvalidOrExpired
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, ErrInvalidOrExpired
	}

	nonceSize := gcm.NonceSize()
	if len(raw) < nonceSize {
		return nil, ErrInvalidOrExpired
	}
	nonce, ciphertext := raw[:nonceSize], raw[nonceSize:]

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, ErrInvalidOrExpired
	}

	var payload Payload
	if err := json.Unmarshal(plaintext, &payload); err != nil {
		return nil, ErrInvalidOrExpired
	}

	if time.Now().Unix() > payload.Exp {
		return nil, ErrInvalidOrExpired
	}

	return &payload, nil
}
