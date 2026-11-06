# Bucket S3

resource "aws_s3_bucket" "App" {
  bucket = "${var.app}-${var.env}-app"
}

resource "aws_s3_bucket_ownership_controls" "App" {
  bucket = aws_s3_bucket.App.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "App" {
  bucket = aws_s3_bucket.App.id
  block_public_acls       = false
  block_public_policy     = false
}

resource "aws_s3_bucket_acl" "App" {
  depends_on = [aws_s3_bucket_ownership_controls.App]
  bucket = aws_s3_bucket.App.id
  acl    = "public-read"
}

resource "aws_s3_bucket_website_configuration" "App" {
  bucket = aws_s3_bucket.App.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_cloudfront_distribution" "App" {
  price_class = var.cdn_price_class
  default_root_object = "index.html"
  enabled             = true
  is_ipv6_enabled     = true

  origin {
    domain_name = aws_s3_bucket_website_configuration.App.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.App.bucket}"

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
    target_origin_id       = "S3-${aws_s3_bucket.App.bucket}"
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

output "app_endpoint" {
  value = "https://${aws_cloudfront_distribution.App.domain_name}"
}

output "app_cdn_id" {
  value = aws_cloudfront_distribution.App.id
}
