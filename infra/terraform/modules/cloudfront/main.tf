# ─── Managed Policy IDs ───────────────────────────────────────────────────────
# Hardcoded because data source lookups for these cause "inconsistent final plan"
# errors in the AWS provider. These are AWS-owned constants — same ID in every
# account and region. Source: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html

locals {
  cache_policy_caching_disabled              = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  cache_policy_caching_optimized             = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  origin_request_policy_all_viewer_except_host_header = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
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
  aliases             = [var.domain_name]

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
      cache_policy_id = local.cache_policy_caching_disabled
      # AllViewerExceptHostHeader — forwards Authorization, Content-Type, etc.
      origin_request_policy_id = local.origin_request_policy_all_viewer_except_host_header

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
    cache_policy_id = local.cache_policy_caching_optimized

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
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
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
