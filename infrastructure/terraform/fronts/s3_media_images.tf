# Bucket S3 images (lecture publique via CloudFront uniquement, jamais de policy S3 publique)

resource "aws_s3_bucket" "MediaImages" {
  bucket = "${var.app}-${var.env}-images"
}

resource "aws_s3_bucket_public_access_block" "MediaImages" {
  bucket                  = aws_s3_bucket.MediaImages.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "MediaImages" {
  bucket = aws_s3_bucket.MediaImages.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT"]
    allowed_origins = [var.back_office_endpoint, var.app_endpoint, "https://${var.back_office_domain}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_cloudfront_origin_access_control" "MediaImages" {
  name                              = "${var.app}-${var.env}-media-images"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "MediaImages" {
  price_class     = var.cdn_price_class
  enabled         = true
  is_ipv6_enabled = true

  origin {
    domain_name              = aws_s3_bucket.MediaImages.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.MediaImages.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.MediaImages.id
  }

  default_cache_behavior {
    allowed_methods        = ["HEAD", "GET"]
    cached_methods         = ["HEAD", "GET"]
    viewer_protocol_policy = "redirect-to-https"
    target_origin_id       = "S3-${aws_s3_bucket.MediaImages.bucket}"
    compress               = true

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

resource "aws_s3_bucket_policy" "MediaImagesCloudFrontOnly" {
  depends_on = [aws_s3_bucket_public_access_block.MediaImages]
  bucket     = aws_s3_bucket.MediaImages.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "CloudFrontServiceRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.MediaImages.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.MediaImages.arn
        }
      }
    }]
  })
}

output "media_image_cdn_domain" {
  value = aws_cloudfront_distribution.MediaImages.domain_name
}
