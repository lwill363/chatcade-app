# ─── Managed Policy Lookups ───────────────────────────────────────────────────
# AWS managed policies are prefixed with "Managed-" in their Name field.

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host_header" {
  name = "Managed-AllViewerExceptHostHeader"
}

# ─── Origin Access Control ────────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "${var.name}-oac"
  description                       = "OAC for ${var.name} S3 origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─── CloudFront Distribution ──────────────────────────────────────────────────

locals {
  # Strip "https://" and any trailing slash to get a bare domain for CloudFront
  api_gateway_domain = trimsuffix(trimprefix(var.api_gateway_url, "https://"), "/")
}

resource "aws_cloudfront_distribution" "this" {
  # S3 origin — serves the React SPA
  origin {
    domain_name              = var.s3_bucket_regional_domain_name
    origin_id                = "S3"
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  # API Gateway origin — API requests forwarded with secret header for obscurity
  origin {
    domain_name = local.api_gateway_domain
    origin_id   = "ApiGateway"

    custom_header {
      name  = "x-origin-secret"
      value = var.api_origin_secret
    }

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # API path behaviors — matched before the default S3 behavior.
  # No caching; Authorization header and query strings are forwarded.
  dynamic "ordered_cache_behavior" {
    for_each = var.api_path_patterns

    content {
      path_pattern     = ordered_cache_behavior.value
      allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods   = ["GET", "HEAD"]
      target_origin_id = "ApiGateway"
      compress         = false

      # CachingDisabled — no caching for API responses
      cache_policy_id = data.aws_cloudfront_cache_policy.caching_disabled.id
      # AllViewerExceptHostHeader — forwards Authorization, Content-Type, etc.
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id

      viewer_protocol_policy = "https-only"
    }
  }

  # Default behavior — serves the React SPA from S3
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3"
    compress         = true

    # CachingOptimized — long cache for immutable frontend assets
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id

    viewer_protocol_policy = "redirect-to-https"
  }

  # SPA routing: S3 returns 403 for missing paths (private bucket), redirect to
  # index.html so React Router can handle the route client-side.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.name}-distribution"
  }

  lifecycle {
    # Ignore WAF Web ACL changes — the free plan subscription prevents removing
    # the association until the billing period ends. Remove this once off the plan.
    ignore_changes = [web_acl_id]
  }
}

# ─── S3 Bucket Policy ─────────────────────────────────────────────────────────

resource "aws_s3_bucket_policy" "this" {
  bucket = var.s3_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${var.s3_bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.this.arn
          }
        }
      }
    ]
  })
}
