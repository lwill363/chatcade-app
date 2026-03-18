output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

output "migration_ecs_security_group_id" {
  value = module.migration_ecs.security_group_id
}

output "api_gateway_url" {
  value = module.http_api.invoke_url
}

output "frontend_bucket" {
  value = module.frontend.bucket_name
}

output "frontend_distribution_id" {
  value = module.cloudfront.distribution_id
}

output "frontend_url" {
  value = "https://${module.cloudfront.domain_name}"
}

output "ws_url" {
  description = "WebSocket API Gateway URL (wss://). Pass as VITE_WS_URL to the frontend build."
  value       = aws_apigatewayv2_stage.ws.invoke_url
}