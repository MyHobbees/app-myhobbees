package media

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"
)

func testKeyPair(t *testing.T) (*rsa.PrivateKey, string) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatalf("marshal key: %v", err)
	}
	pemKey := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})
	return key, string(pemKey)
}

func TestFromEnv_NotConfigured(t *testing.T) {
	t.Setenv("MEDIA_VIDEO_BUCKET", "")
	t.Setenv("MEDIA_IMAGE_BUCKET", "")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "")

	_, err := FromEnv(context.Background())
	if !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("expected ErrNotConfigured, got %v", err)
	}
}

func TestPresignUpload_NotConfiguredWithoutBucket(t *testing.T) {
	t.Setenv("MEDIA_VIDEO_BUCKET", "")
	t.Setenv("MEDIA_IMAGE_BUCKET", "myhobbees-stg-images")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "")

	client, err := FromEnv(context.Background())
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}

	_, _, err = client.PresignUpload(context.Background(), "video", "x.mp4")
	if !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("expected ErrNotConfigured for unset video bucket, got %v", err)
	}
}

func TestPresignUpload_InvalidBucketKind(t *testing.T) {
	t.Setenv("MEDIA_VIDEO_BUCKET", "myhobbees-stg-video")
	t.Setenv("MEDIA_IMAGE_BUCKET", "myhobbees-stg-images")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "")

	client, err := FromEnv(context.Background())
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}

	if _, _, err := client.PresignUpload(context.Background(), "other", "x.mp4"); err == nil {
		t.Fatal("expected an error for an unknown bucket kind")
	}
}

func TestPresignUpload_Success(t *testing.T) {
	t.Setenv("MEDIA_VIDEO_BUCKET", "myhobbees-stg-video")
	t.Setenv("MEDIA_IMAGE_BUCKET", "myhobbees-stg-images")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "")
	t.Setenv("AWS_ACCESS_KEY_ID", "test-access-key")
	t.Setenv("AWS_SECRET_ACCESS_KEY", "test-secret-key")
	t.Setenv("AWS_REGION", "eu-west-3")

	client, err := FromEnv(context.Background())
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}

	rawURL, expiresAt, err := client.PresignUpload(context.Background(), "video", "uploads/x.mp4")
	if err != nil {
		t.Fatalf("PresignUpload: %v", err)
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		t.Fatalf("parse presigned url: %v", err)
	}
	if !strings.Contains(parsed.Host, "myhobbees-stg-video") {
		t.Fatalf("expected host to reference the video bucket, got %q", parsed.Host)
	}
	if parsed.Query().Get("X-Amz-Signature") == "" {
		t.Fatal("expected X-Amz-Signature in presigned url")
	}
	if parsed.Query().Get("X-Amz-Expires") == "" {
		t.Fatal("expected X-Amz-Expires in presigned url")
	}
	if expiresAt.Before(time.Now()) {
		t.Fatal("expected expiresAt to be in the future")
	}
}

func TestSignVideoURL_NotConfigured(t *testing.T) {
	t.Setenv("MEDIA_VIDEO_BUCKET", "myhobbees-stg-video")
	t.Setenv("MEDIA_IMAGE_BUCKET", "myhobbees-stg-images")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "")

	client, err := FromEnv(context.Background())
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}

	if _, _, err := client.SignVideoURL("x.mp4", time.Minute); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("expected ErrNotConfigured, got %v", err)
	}
}

func TestFromEnv_InvalidPrivateKey(t *testing.T) {
	t.Setenv("MEDIA_VIDEO_BUCKET", "")
	t.Setenv("MEDIA_IMAGE_BUCKET", "")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "d123.cloudfront.net")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "K123")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "not a pem key")

	if _, err := FromEnv(context.Background()); err == nil {
		t.Fatal("expected an error for an invalid PEM private key")
	}
}

func TestSignVideoURL_SignatureVerifiesAndExpires(t *testing.T) {
	privateKey, pemKey := testKeyPair(t)

	t.Setenv("MEDIA_VIDEO_BUCKET", "")
	t.Setenv("MEDIA_IMAGE_BUCKET", "")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "d123.cloudfront.net")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "K123TESTKEY")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", pemKey)

	client, err := FromEnv(context.Background())
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}

	ttl := 15 * time.Minute
	signedURL, expiresAt, err := client.SignVideoURL("videos/clip.mp4", ttl)
	if err != nil {
		t.Fatalf("SignVideoURL: %v", err)
	}

	parsed, err := url.Parse(signedURL)
	if err != nil {
		t.Fatalf("parse signed url: %v", err)
	}
	if !strings.HasPrefix(signedURL, "https://d123.cloudfront.net/videos/clip.mp4?") {
		t.Fatalf("unexpected signed url: %q", signedURL)
	}

	query := parsed.Query()
	if query.Get("Key-Pair-Id") != "K123TESTKEY" {
		t.Fatalf("unexpected Key-Pair-Id: %q", query.Get("Key-Pair-Id"))
	}
	expiresParam := query.Get("Expires")
	if expiresParam == "" {
		t.Fatal("expected Expires param")
	}
	expiresUnix, err := strconv.ParseInt(expiresParam, 10, 64)
	if err != nil {
		t.Fatalf("parse Expires: %v", err)
	}
	if expiresUnix != expiresAt.Unix() {
		t.Fatalf("Expires param %d does not match returned expiry %d", expiresUnix, expiresAt.Unix())
	}

	signatureParam := query.Get("Signature")
	if signatureParam == "" {
		t.Fatal("expected Signature param")
	}

	signature := cloudFrontDecode(t, signatureParam)
	resourceURL := "https://d123.cloudfront.net/videos/clip.mp4"
	policy := []byte(`{"Statement":[{"Resource":"` + resourceURL + `","Condition":{"DateLessThan":{"AWS:EpochTime":` + expiresParam + `}}}]}`)
	sum := sha1.Sum(policy)

	if err := rsa.VerifyPKCS1v15(&privateKey.PublicKey, crypto.SHA1, sum[:], signature); err != nil {
		t.Fatalf("signature does not verify against the matching public key: %v", err)
	}

	shortExpiry, shortExpiresAt, err := client.SignVideoURL("videos/clip.mp4", time.Minute)
	if err != nil {
		t.Fatalf("SignVideoURL (short ttl): %v", err)
	}
	if shortExpiresAt.Unix() == expiresAt.Unix() {
		t.Fatal("expected a shorter ttl to produce a different expiry")
	}
	shortParsed, err := url.Parse(shortExpiry)
	if err != nil {
		t.Fatalf("parse short-ttl signed url: %v", err)
	}
	if shortParsed.Query().Get("Expires") == expiresParam {
		t.Fatal("expected Expires to change when ttl changes")
	}
}

func TestImagePublicURL_NotConfigured(t *testing.T) {
	t.Setenv("MEDIA_VIDEO_BUCKET", "myhobbees-stg-video")
	t.Setenv("MEDIA_IMAGE_BUCKET", "myhobbees-stg-images")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "")
	t.Setenv("MEDIA_IMAGE_CDN_DOMAIN", "")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "")

	client, err := FromEnv(context.Background())
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}

	if _, err := client.ImagePublicURL("x.jpg"); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("expected ErrNotConfigured, got %v", err)
	}
}

func TestImagePublicURL_Success(t *testing.T) {
	t.Setenv("MEDIA_VIDEO_BUCKET", "")
	t.Setenv("MEDIA_IMAGE_BUCKET", "")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "")
	t.Setenv("MEDIA_IMAGE_CDN_DOMAIN", "dimg456.cloudfront.net")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "")

	client, err := FromEnv(context.Background())
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}

	readURL, err := client.ImagePublicURL("uploads/clip one.jpg")
	if err != nil {
		t.Fatalf("ImagePublicURL: %v", err)
	}
	const want = "https://dimg456.cloudfront.net/uploads/clip%20one.jpg"
	if readURL != want {
		t.Fatalf("ImagePublicURL = %q, want %q", readURL, want)
	}
}

func TestSignVideoURL_EscapesSpecialCharactersInKey(t *testing.T) {
	privateKey, pemKey := testKeyPair(t)

	t.Setenv("MEDIA_VIDEO_BUCKET", "")
	t.Setenv("MEDIA_IMAGE_BUCKET", "")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "d123.cloudfront.net")
	t.Setenv("MEDIA_IMAGE_CDN_DOMAIN", "")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "K123TESTKEY")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", pemKey)

	client, err := FromEnv(context.Background())
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}

	rawKey := "videos/clip #1 (final)?.mp4"
	signedURL, expiresAt, err := client.SignVideoURL(rawKey, 15*time.Minute)
	if err != nil {
		t.Fatalf("SignVideoURL: %v", err)
	}

	parsed, err := url.Parse(signedURL)
	if err != nil {
		t.Fatalf("parse signed url: %v", err)
	}
	// A raw "#" or "?" in the key must not be mistaken for a URL fragment
	// or the start of the query string the Expires/Signature/Key-Pair-Id
	// params are appended to.
	if parsed.Fragment != "" {
		t.Fatalf("expected no URL fragment, got %q", parsed.Fragment)
	}
	for _, param := range []string{"Expires", "Signature", "Key-Pair-Id"} {
		if parsed.Query().Get(param) == "" {
			t.Fatalf("expected %q query param, got url %q", param, signedURL)
		}
	}

	resourceURL := "https://d123.cloudfront.net/" + escapeObjectKey(rawKey)
	policy := []byte(`{"Statement":[{"Resource":"` + resourceURL + `","Condition":{"DateLessThan":{"AWS:EpochTime":` + strconv.FormatInt(expiresAt.Unix(), 10) + `}}}]}`)
	sum := sha1.Sum(policy)
	signature := cloudFrontDecode(t, parsed.Query().Get("Signature"))
	if err := rsa.VerifyPKCS1v15(&privateKey.PublicKey, crypto.SHA1, sum[:], signature); err != nil {
		t.Fatalf("signature does not verify against the escaped resource url: %v", err)
	}
}

func cloudFrontDecode(t *testing.T, s string) []byte {
	t.Helper()
	s = strings.ReplaceAll(s, "-", "+")
	s = strings.ReplaceAll(s, "_", "=")
	s = strings.ReplaceAll(s, "~", "/")
	decoded, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		t.Fatalf("decode signature: %v", err)
	}
	return decoded
}
