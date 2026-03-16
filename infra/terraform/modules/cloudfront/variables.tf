variable "name" {
  type        = string
  description = "Base name for CloudFront resources (e.g. chatcade-prod)"
}

variable "s3_bucket_id" {
  type        = string
  description = "ID of the S3 bucket to grant CloudFront access to"
}

variable "s3_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket (used in the bucket policy)"
}

variable "s3_bucket_regional_domain_name" {
  type        = string
  description = "Regional domain name of the S3 bucket (used as the S3 origin)"
}

variable "api_gateway_url" {
  type        = string
  description = "API Gateway invoke URL (e.g. https://abc123.execute-api.us-east-1.amazonaws.com)"
}

variable "api_origin_secret" {
  type        = string
  sensitive   = true
  description = "Secret CloudFront sends to API Gateway in X-Origin-Secret for obscurity"
}

variable "api_path_patterns" {
  type        = list(string)
  description = "Path patterns routed to the API Gateway origin instead of S3"
  default     = ["/api/*"]
}
