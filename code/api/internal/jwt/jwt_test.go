package jwt

import (
	"testing"
	"time"
)

func TestSignVerifyRoundTrip(t *testing.T) {
	const secret = "test-secret-at-least-32-characters-long"

	token, err := Sign(secret, "user-123", "user@example.com", true, AudienceBackoffice, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	claims, err := Verify(secret, token, AudienceBackoffice)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.Subject != "user-123" {
		t.Errorf("subject = %q, want user-123", claims.Subject)
	}
	if claims.Email != "user@example.com" {
		t.Errorf("email = %q, want user@example.com", claims.Email)
	}
	if !claims.IsSuperAdmin {
		t.Error("isSuperAdmin = false, want true")
	}
}

func TestVerifyRejectsWrongSecret(t *testing.T) {
	token, err := Sign("secret-one-secret-one-secret-one-xx", "u", "", false, AudienceBackoffice, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := Verify("different-secret-different-secret-x", token, AudienceBackoffice); err == nil {
		t.Error("expected verification to fail with wrong secret")
	}
}

func TestVerifyRejectsExpired(t *testing.T) {
	const secret = "test-secret-at-least-32-characters-long"
	token, err := Sign(secret, "u", "", false, AudienceBackoffice, -time.Minute)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := Verify(secret, token, AudienceBackoffice); err == nil {
		t.Error("expected verification to fail for expired token")
	}
}

func TestVerifyRejectsWrongAudience(t *testing.T) {
	const secret = "test-secret-at-least-32-characters-long"
	token, err := Sign(secret, "u", "", false, AudienceApp, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := Verify(secret, token, AudienceBackoffice); err == nil {
		t.Error("expected verification to fail for a token signed with a different audience")
	}
}

func TestVerifyRejectsMissingAudience(t *testing.T) {
	const secret = "test-secret-at-least-32-characters-long"
	token, err := Sign(secret, "u", "", false, "", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := Verify(secret, token, AudienceBackoffice); err == nil {
		t.Error("expected verification to fail for a token with no aud, checked against AudienceBackoffice")
	}
	if _, err := Verify(secret, token, AudienceApp); err == nil {
		t.Error("expected verification to fail for a token with no aud, checked against AudienceApp")
	}
}
