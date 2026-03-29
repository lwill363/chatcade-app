# ─── WebSocket API Gateway ────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "ws" {
  name                       = "${var.project_name}-${var.environment}-ws-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.type"

  tags = {
    Name = "${var.project_name}-${var.environment}-ws-api"
  }
}

resource "aws_apigatewayv2_stage" "ws" {
  api_id      = aws_apigatewayv2_api.ws.id
  name        = "$default"
  auto_deploy = true
}

locals {
  # Management API URL — used by Lambdas to push messages back to clients
  ws_callback_url = "https://${aws_apigatewayv2_api.ws.id}.execute-api.${var.region}.amazonaws.com/${aws_apigatewayv2_stage.ws.name}"
}

# ─── WebSocket Lambdas ────────────────────────────────────────────────────────

data "aws_ssm_parameter" "ws_db_url" {
  name            = "${var.project_ssm_ps_root_path}/websockets/database_url"
  with_decryption = true
}

module "ws_connect_lambda" {
  source        = "./modules/lambda"
  name          = "${var.project_name}-${var.environment}-ws-connect"
  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnet_ids
  filename      = "${path.root}/../../backend/dist/ws-connect.zip"
  memory_size   = 128
  timeout       = 10
  alarm_sns_arn = aws_sns_topic.lambda_alarms.arn
  environment = {
    DATABASE_URL    = data.aws_ssm_parameter.ws_db_url.value
    JWT_SECRET      = data.aws_ssm_parameter.jwt_secret.value
    WS_CALLBACK_URL = local.ws_callback_url
    NODE_ENV        = "production"
  }
}

module "ws_disconnect_lambda" {
  source        = "./modules/lambda"
  name          = "${var.project_name}-${var.environment}-ws-disconnect"
  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnet_ids
  filename      = "${path.root}/../../backend/dist/ws-disconnect.zip"
  memory_size   = 128
  timeout       = 10
  alarm_sns_arn = aws_sns_topic.lambda_alarms.arn
  environment = {
    DATABASE_URL    = data.aws_ssm_parameter.ws_db_url.value
    JWT_SECRET      = data.aws_ssm_parameter.jwt_secret.value
    WS_CALLBACK_URL = local.ws_callback_url
    NODE_ENV        = "production"
  }
}

module "ws_default_lambda" {
  source        = "./modules/lambda"
  name          = "${var.project_name}-${var.environment}-ws-default"
  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnet_ids
  filename      = "${path.root}/../../backend/dist/ws-default.zip"
  memory_size   = 128
  timeout       = 10
  alarm_sns_arn = aws_sns_topic.lambda_alarms.arn
  environment = {
    DATABASE_URL    = data.aws_ssm_parameter.ws_db_url.value
    JWT_SECRET      = data.aws_ssm_parameter.jwt_secret.value
    WS_CALLBACK_URL = local.ws_callback_url
    NODE_ENV        = "production"
  }
}

module "ws_cleanup_lambda" {
  source        = "./modules/lambda"
  name          = "${var.project_name}-${var.environment}-ws-cleanup"
  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnet_ids
  filename      = "${path.root}/../../backend/dist/ws-cleanup.zip"
  memory_size   = 128
  timeout       = 30
  alarm_sns_arn = aws_sns_topic.lambda_alarms.arn
  environment = {
    DATABASE_URL = data.aws_ssm_parameter.ws_db_url.value
    JWT_SECRET   = data.aws_ssm_parameter.jwt_secret.value
    NODE_ENV     = "production"
  }
}

# ─── WebSocket API Routes ─────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "ws_connect" {
  api_id           = aws_apigatewayv2_api.ws.id
  integration_type = "AWS_PROXY"
  integration_uri  = module.ws_connect_lambda.invoke_arn
}

resource "aws_apigatewayv2_integration" "ws_disconnect" {
  api_id           = aws_apigatewayv2_api.ws.id
  integration_type = "AWS_PROXY"
  integration_uri  = module.ws_disconnect_lambda.invoke_arn
}

resource "aws_apigatewayv2_integration" "ws_default" {
  api_id           = aws_apigatewayv2_api.ws.id
  integration_type = "AWS_PROXY"
  integration_uri  = module.ws_default_lambda.invoke_arn
}

resource "aws_apigatewayv2_route" "ws_connect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_connect.id}"
}

resource "aws_apigatewayv2_route" "ws_disconnect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_disconnect.id}"
}

resource "aws_apigatewayv2_route" "ws_default" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.ws_default.id}"
}

resource "aws_lambda_permission" "ws_connect_invoke" {
  statement_id  = "AllowAPIGatewayWsConnect"
  action        = "lambda:InvokeFunction"
  function_name = module.ws_connect_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ws.execution_arn}/*/*"
}

resource "aws_lambda_permission" "ws_disconnect_invoke" {
  statement_id  = "AllowAPIGatewayWsDisconnect"
  action        = "lambda:InvokeFunction"
  function_name = module.ws_disconnect_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ws.execution_arn}/*/*"
}

resource "aws_lambda_permission" "ws_default_invoke" {
  statement_id  = "AllowAPIGatewayWsDefault"
  action        = "lambda:InvokeFunction"
  function_name = module.ws_default_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ws.execution_arn}/*/*"
}

# ─── IAM: ws-default, messages, and channels can push messages back to WebSocket clients ──

resource "aws_iam_role_policy" "ws_default_manage_connections" {
  name = "manage-websocket-connections"
  role = module.ws_default_lambda.role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "execute-api:ManageConnections"
      Resource = "${aws_apigatewayv2_api.ws.execution_arn}/*"
    }]
  })
}

resource "aws_iam_role_policy" "messages_manage_connections" {
  name = "manage-websocket-connections"
  role = module.messages_lambda.role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "execute-api:ManageConnections"
      Resource = "${aws_apigatewayv2_api.ws.execution_arn}/*"
    }]
  })
}

resource "aws_iam_role_policy" "channels_manage_connections" {
  name = "manage-websocket-connections"
  role = module.channels_lambda.role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "execute-api:ManageConnections"
      Resource = "${aws_apigatewayv2_api.ws.execution_arn}/*"
    }]
  })
}

# ─── EventBridge: periodic stale connection cleanup ───────────────────────────

resource "aws_cloudwatch_event_rule" "ws_cleanup" {
  name                = "${var.project_name}-${var.environment}-ws-cleanup"
  description         = "Trigger WebSocket stale connection cleanup every 2 minutes"
  schedule_expression = "rate(2 minutes)"
}

resource "aws_cloudwatch_event_target" "ws_cleanup" {
  rule = aws_cloudwatch_event_rule.ws_cleanup.name
  arn  = module.ws_cleanup_lambda.lambda_arn
}

resource "aws_lambda_permission" "ws_cleanup_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.ws_cleanup_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ws_cleanup.arn
}
