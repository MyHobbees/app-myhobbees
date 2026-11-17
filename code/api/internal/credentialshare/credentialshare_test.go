package credentialshare

import (
	"errors"
	"strings"
	"testing"
	"time"
)

const testSecret = "a-32-byte-secret-for-aes-256-ok!"

func TestSealOpen_RoundTrip(t *testing.T) {
	if len(testSecret) != 32 {
		t.Fatalf("test secret must be exactly 32 bytes, got %d", len(testSecret))
	}

	payload := Payload{
		Email:    "new-admin@myhobbees.fr",
		Password: "a-generated-strong-password",
		ShareID:  42,
		Exp:      time.Now().Add(24 * time.Hour).Unix(),
	}

	token, err := Seal(testSecret, payload)
	if err != nil {
		t.Fatalf("seal: %v", err)
	}

	got, err := Open(testSecret, token)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if *got != payload {
		t.Fatalf("round-trip mismatch: got %+v, want %+v", *got, payload)
	}
}

func TestOpen_TamperedTokenIsRejected(t *testing.T) {
	payload := Payload{Email: "x@y.fr", Password: "p", ShareID: 1, Exp: time.Now().Add(time.Hour).Unix()}
	token, err := Seal(testSecret, payload)
	if err != nil {
		t.Fatalf("seal: %v", err)
	}

	tampered := []rune(token)
	// Flip one character; if it happens to produce the same char (rare for
	// base64url alphabet), nudge again.
	idx := len(tampered) / 2
	original := tampered[idx]
	for _, c := range "abcdefghijklmnopqrstuvwxyz0123456789" {
		if c != original {
			tampered[idx] = c
			break
		}
	}

	if _, err := Open(testSecret, string(tampered)); !errors.Is(err, ErrInvalidOrExpired) {
		t.Fatalf("expected ErrInvalidOrExpired for a tampered token, got %v", err)
	}
}

func TestOpen_WrongSecretIsRejected(t *testing.T) {
	payload := Payload{Email: "x@y.fr", Password: "p", ShareID: 1, Exp: time.Now().Add(time.Hour).Unix()}
	token, err := Seal(testSecret, payload)
	if err != nil {
		t.Fatalf("seal: %v", err)
	}

	otherSecret := "a-different-32-byte-secret-here!"
	if len(otherSecret) != 32 {
		t.Fatalf("other secret must be exactly 32 bytes, got %d", len(otherSecret))
	}

	if _, err := Open(otherSecret, token); !errors.Is(err, ErrInvalidOrExpired) {
		t.Fatalf("expected ErrInvalidOrExpired for the wrong secret, got %v", err)
	}
}

func TestOpen_ExpiredTokenIsRejected(t *testing.T) {
	payload := Payload{Email: "x@y.fr", Password: "p", ShareID: 1, Exp: time.Now().Add(-time.Hour).Unix()}
	token, err := Seal(testSecret, payload)
	if err != nil {
		t.Fatalf("seal: %v", err)
	}

	if _, err := Open(testSecret, token); !errors.Is(err, ErrInvalidOrExpired) {
		t.Fatalf("expected ErrInvalidOrExpired for an expired token, got %v", err)
	}
}

func TestOpen_GarbageTokenIsRejectedNotPanicking(t *testing.T) {
	if _, err := Open(testSecret, "not-a-valid-token-at-all"); !errors.Is(err, ErrInvalidOrExpired) {
		t.Fatalf("expected ErrInvalidOrExpired for garbage input, got %v", err)
	}
	if _, err := Open(testSecret, strings.Repeat("a", 4)); !errors.Is(err, ErrInvalidOrExpired) {
		t.Fatalf("expected ErrInvalidOrExpired for a too-short token, got %v", err)
	}
}
