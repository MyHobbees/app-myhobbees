# Bucket S3 vidéo (privé, lecture uniquement via CloudFront signé)

resource "aws_s3_bucket" "MediaVideo" {
  bucket = "${var.app}-${var.env}-video"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "MediaVideo" {
  bucket = aws_s3_bucket.MediaVideo.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "MediaVideo" {
  bucket                  = aws_s3_bucket.MediaVideo.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "MediaVideo" {
  bucket = aws_s3_bucket.MediaVideo.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT"]
    allowed_origins = [var.back_office_endpoint, var.app_endpoint, "https://${var.back_office_domain}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_cloudfront_origin_access_control" "MediaVideo" {
  name                              = "${var.app}-${var.env}-media-video"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_public_key" "MediaVideo" {
  name        = "${var.app}-${var.env}-media-video"
  encoded_key = var.cloudfront_video_public_key
}

resource "aws_cloudfront_key_group" "MediaVideo" {
  name  = "${var.app}-${var.env}-media-video"
  items = [aws_cloudfront_public_key.MediaVideo.id]
}

resource "aws_cloudfront_distribution" "MediaVideo" {
  price_class     = var.cdn_price_class
  enabled         = true
  is_ipv6_enabled = true

  origin {
    domain_name              = aws_s3_bucket.MediaVideo.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.MediaVideo.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.MediaVideo.id
  }

  default_cache_behavior {
    allowed_methods        = ["HEAD", "GET"]
    cached_methods         = ["HEAD", "GET"]
    viewer_protocol_policy = "https-only"
    target_origin_id       = "S3-${aws_s3_bucket.MediaVideo.bucket}"
    compress               = true
    trusted_key_groups     = [aws_cloudfront_key_group.MediaVideo.id]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    default_ttl = 86400
    max_ttl     = 604800
    min_ttl     = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.1_2016"
  }
}

resource "aws_s3_bucket_policy" "MediaVideoCloudFrontOnly" {
  depends_on = [aws_s3_bucket_public_access_block.MediaVideo]
  bucket     = aws_s3_bucket.MediaVideo.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "CloudFrontServiceRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.MediaVideo.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.MediaVideo.arn
        }
      }
    }]
  })
}

output "media_video_cdn_domain" {
  value = aws_cloudfront_distribution.MediaVideo.domain_name
}

output "media_video_cloudfront_public_key_id" {
  value = aws_cloudfront_public_key.MediaVideo.id
}
