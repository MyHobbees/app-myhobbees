// Package media generates presigned S3 upload URLs and signed CloudFront
// video URLs, scoped to exactly the two buckets provisioned in
// infrastructure/terraform/fronts/s3_media_video.tf and s3_media_images.tf.
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
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var ErrNotConfigured = errors.New("media not configured")

// Client holds everything needed for both capabilities this package
// offers. The two are independent (see FromEnv): a Lambda missing the
// CloudFront signing key can still presign uploads, and vice versa.
type Client struct {
	s3             *s3.Client
	videoBucket    string
	imageBucket    string
	videoCDNDomain string
	keyPairID      string
	privateKey     *rsa.PrivateKey
}

// FromEnv reads MEDIA_VIDEO_BUCKET, MEDIA_IMAGE_BUCKET,
// MEDIA_VIDEO_CDN_DOMAIN, CLOUDFRONT_VIDEO_KEY_ID and
// CLOUDFRONT_VIDEO_PRIVATE_KEY. It never fails outright when one of the two
// capabilities' variables is missing — PresignUpload and SignVideoURL each
// check their own prerequisites and return ErrNotConfigured individually.
func FromEnv(ctx context.Context) (*Client, error) {
	videoBucket := os.Getenv("MEDIA_VIDEO_BUCKET")
	imageBucket := os.Getenv("MEDIA_IMAGE_BUCKET")
	videoCDNDomain := os.Getenv("MEDIA_VIDEO_CDN_DOMAIN")
	keyPairID := os.Getenv("CLOUDFRONT_VIDEO_KEY_ID")
	privateKeyPEM := os.Getenv("CLOUDFRONT_VIDEO_PRIVATE_KEY")

	if videoBucket == "" && imageBucket == "" && (videoCDNDomain == "" || keyPairID == "" || privateKeyPEM == "") {
		return nil, ErrNotConfigured
	}

	var privateKey *rsa.PrivateKey
	if privateKeyPEM != "" {
		key, err := parsePrivateKey(privateKeyPEM)
		if err != nil {
			return nil, fmt.Errorf("media: invalid CLOUDFRONT_VIDEO_PRIVATE_KEY: %w", err)
		}
		privateKey = key
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	return &Client{
		s3:             s3.NewFromConfig(cfg),
		videoBucket:    videoBucket,
		imageBucket:    imageBucket,
		videoCDNDomain: videoCDNDomain,
		keyPairID:      keyPairID,
		privateKey:     privateKey,
	}, nil
}

func parsePrivateKey(pemKey string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(pemKey))
	if block == nil {
		return nil, errors.New("no PEM block found")
	}
	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return key, nil
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	key, ok := parsed.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("PEM block is not an RSA private key")
	}
	return key, nil
}

const presignUploadTTL = 15 * time.Minute

// PresignUpload returns a presigned PUT URL for the given bucket kind
// ("video" or "image") and object key, valid for 15 minutes.
func (c *Client) PresignUpload(ctx context.Context, bucketKind string, objectKey string) (string, time.Time, error) {
	var bucket string
	switch bucketKind {
	case "video":
		bucket = c.videoBucket
	case "image":
		bucket = c.imageBucket
	default:
		return "", time.Time{}, fmt.Errorf("media: unknown bucket kind %q", bucketKind)
	}
	if bucket == "" || c.s3 == nil {
		return "", time.Time{}, ErrNotConfigured
	}

	presignClient := s3.NewPresignClient(c.s3)
	req, err := presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(objectKey),
	}, s3.WithPresignExpires(presignUploadTTL))
	if err != nil {
		return "", time.Time{}, err
	}

	return req.URL, time.Now().Add(presignUploadTTL), nil
}

// SignVideoURL returns a CloudFront-signed URL for objectKey in the video
// CDN, valid for ttl, using the "canned" CloudFront policy (one resource,
// one expiry — no IP/start-time restriction).
func (c *Client) SignVideoURL(objectKey string, ttl time.Duration) (string, time.Time, error) {
	if c.videoCDNDomain == "" || c.keyPairID == "" || c.privateKey == nil {
		return "", time.Time{}, ErrNotConfigured
	}

	expiresAt := time.Now().Add(ttl)
	resourceURL := fmt.Sprintf("https://%s/%s", c.videoCDNDomain, objectKey)

	policy := fmt.Sprintf(
		`{"Statement":[{"Resource":"%s","Condition":{"DateLessThan":{"AWS:EpochTime":%d}}}]}`,
		resourceURL, expiresAt.Unix(),
	)

	sum := sha1.Sum([]byte(policy))
	signature, err := rsa.SignPKCS1v15(rand.Reader, c.privateKey, crypto.SHA1, sum[:])
	if err != nil {
		return "", time.Time{}, err
	}

	signedURL := fmt.Sprintf(
		"%s?Expires=%d&Signature=%s&Key-Pair-Id=%s",
		resourceURL, expiresAt.Unix(), cloudFrontEncode(signature), c.keyPairID,
	)

	return signedURL, expiresAt, nil
}

// cloudFrontEncode applies CloudFront's own base64 variant: standard
// base64, then "+"->"-", "="->"_", "/"->"~".
func cloudFrontEncode(b []byte) string {
	s := base64.StdEncoding.EncodeToString(b)
	s = strings.ReplaceAll(s, "+", "-")
	s = strings.ReplaceAll(s, "=", "_")
	s = strings.ReplaceAll(s, "/", "~")
	return s
}
