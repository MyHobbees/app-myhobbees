package routes

import (
	"bytes"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/jwt"
)

func testRSAPrivateKeyPEM(t *testing.T) string {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatalf("marshal key: %v", err)
	}
	return string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der}))
}

// Media() no longer applies auth.Middleware itself: that single
// responsibility lives in app.go's protected /v1 group (mirrors
// analytics_test.go). The "no token at all" case is covered end-to-end in
// internal/app/app_test.go.
func mediaTestServer(t *testing.T) (*httptest.Server, string) {
	t.Helper()
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", false, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := httptest.NewServer(auth.Middleware(Media()))
	return srv, token
}

func TestMedia_PresignUpload_NotConfigured(t *testing.T) {
	srv, token := mediaTestServer(t)
	defer srv.Close()

	t.Setenv("MEDIA_VIDEO_BUCKET", "")
	t.Setenv("MEDIA_IMAGE_BUCKET", "")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "")

	body, _ := json.Marshal(map[string]string{"bucket": "video", "key": "x.mp4"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/presign-upload", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadGateway {
		t.Fatalf("expected 502 when not configured, got %d", res.StatusCode)
	}
}

func TestMedia_PresignUpload_InvalidBucket(t *testing.T) {
	srv, token := mediaTestServer(t)
	defer srv.Close()

	t.Setenv("MEDIA_VIDEO_BUCKET", "myhobbees-stg-video")
	t.Setenv("MEDIA_IMAGE_BUCKET", "myhobbees-stg-images")

	body, _ := json.Marshal(map[string]string{"bucket": "autre chose", "key": "x.mp4"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/presign-upload", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for an invalid bucket, got %d", res.StatusCode)
	}
}

func TestMedia_PresignUpload_Success(t *testing.T) {
	srv, token := mediaTestServer(t)
	defer srv.Close()

	t.Setenv("MEDIA_VIDEO_BUCKET", "myhobbees-stg-video")
	t.Setenv("MEDIA_IMAGE_BUCKET", "myhobbees-stg-images")
	t.Setenv("AWS_ACCESS_KEY_ID", "test-access-key")
	t.Setenv("AWS_SECRET_ACCESS_KEY", "test-secret-key")
	t.Setenv("AWS_REGION", "eu-west-3")

	body, _ := json.Marshal(map[string]string{"bucket": "video", "key": "x.mp4"})
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/presign-upload", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}

	var out struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !strings.Contains(out.URL, "myhobbees-stg-video") {
		t.Fatalf("expected url to target the video bucket, got %q", out.URL)
	}
	if !strings.Contains(out.URL, "X-Amz-Signature") || !strings.Contains(out.URL, "X-Amz-Expires") {
		t.Fatalf("expected SigV4 params in url, got %q", out.URL)
	}
}

func TestMedia_VideoURL_NotConfigured(t *testing.T) {
	srv, token := mediaTestServer(t)
	defer srv.Close()

	t.Setenv("MEDIA_VIDEO_BUCKET", "")
	t.Setenv("MEDIA_IMAGE_BUCKET", "")
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", "")

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/video-url?key=x.mp4", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadGateway {
		t.Fatalf("expected 502 when not configured, got %d", res.StatusCode)
	}
}

func TestMedia_VideoURL_MissingKey(t *testing.T) {
	srv, token := mediaTestServer(t)
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/video-url", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 when key is missing, got %d", res.StatusCode)
	}
}

func TestMedia_VideoURL_Success(t *testing.T) {
	srv, token := mediaTestServer(t)
	defer srv.Close()

	privateKeyPEM := testRSAPrivateKeyPEM(t)
	t.Setenv("MEDIA_VIDEO_CDN_DOMAIN", "d123.cloudfront.net")
	t.Setenv("CLOUDFRONT_VIDEO_KEY_ID", "K123TESTKEY")
	t.Setenv("CLOUDFRONT_VIDEO_PRIVATE_KEY", privateKeyPEM)

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/video-url?key=x.mp4", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}

	var out struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !strings.Contains(out.URL, "d123.cloudfront.net") {
		t.Fatalf("expected url to target MEDIA_VIDEO_CDN_DOMAIN, got %q", out.URL)
	}
	for _, param := range []string{"Expires=", "Signature=", "Key-Pair-Id="} {
		if !strings.Contains(out.URL, param) {
			t.Fatalf("expected %q in url, got %q", param, out.URL)
		}
	}
}

func TestMedia_WithoutToken(t *testing.T) {
	srv, _ := mediaTestServer(t)
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/video-url?key=x.mp4", nil)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 without a token, got %d", res.StatusCode)
	}
}
