resource "aws_apigatewayv2_api" "this" {
  name          = var.name
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["Authorization", "Content-Type"]
  }

  tags = {
    Name = var.name
  }
}

resource "aws_apigatewayv2_stage" "this" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
  }
}

locals {
  # One permission per unique Lambda — multiple routes share the same function
  unique_lambda_names = toset([
    for _, v in var.lambda_integrations : v.function_name
  ])
}

resource "aws_lambda_permission" "invoke" {
  for_each = local.unique_lambda_names

  statement_id  = "AllowAPIGatewayInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.key
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "this" {
  for_each = var.lambda_integrations

  api_id           = aws_apigatewayv2_api.this.id
  integration_type = "AWS_PROXY"
  integration_uri  = each.value.invoke_arn
}

resource "aws_apigatewayv2_route" "this" {
  for_each = var.lambda_integrations

  api_id    = aws_apigatewayv2_api.this.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.this[each.key].id}"
}