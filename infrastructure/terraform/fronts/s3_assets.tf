# Bucket S3

resource "aws_s3_bucket" "Assets" {
  bucket = "${var.app}-${var.env}-assets"
}

resource "aws_s3_bucket_ownership_controls" "Assets" {
  bucket = aws_s3_bucket.Assets.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "Assets" {
  bucket = aws_s3_bucket.Assets.id
  block_public_acls       = false
  block_public_policy     = false
}

resource "aws_s3_bucket_acl" "Assets" {
  depends_on = [aws_s3_bucket_ownership_controls.Assets]
  bucket = aws_s3_bucket.Assets.id
  acl    = "public-read"
}

resource "aws_s3_bucket_policy" "AssetsPublicRead" {
  depends_on = [aws_s3_bucket_public_access_block.Assets]
  bucket = aws_s3_bucket.Assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadAllObjects"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.Assets.arn}/*"
    }]
  })
}

resource "aws_s3_bucket_website_configuration" "Assets" {
  bucket = aws_s3_bucket.Assets.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_cloudfront_distribution" "Assets" {
  price_class = var.cdn_price_class
  default_root_object = "index.html"
  enabled             = true
  is_ipv6_enabled     = true

  origin {
    domain_name = aws_s3_bucket_website_configuration.Assets.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.Assets.bucket}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  custom_error_response {
    error_caching_min_ttl = 3000
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  default_cache_behavior {
    allowed_methods        = ["HEAD", "GET"]
    cached_methods         = ["HEAD", "GET"]
    viewer_protocol_policy = "redirect-to-https"
    target_origin_id       = "S3-${aws_s3_bucket.Assets.bucket}"
    compress               = true

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }

    default_ttl = 0
    max_ttl     = 0
    min_ttl     = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version = "TLSv1.1_2016"
  }
}

output "assets_endpoint" {
  value = "https://${aws_cloudfront_distribution.Assets.domain_name}"
}

output "assets_cdn_id" {
  value = aws_cloudfront_distribution.Assets.id
}

resource "aws_s3_bucket_cors_configuration" "Assets" {
  bucket = aws_s3_bucket.Assets.bucket

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "POST", "PUT", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}