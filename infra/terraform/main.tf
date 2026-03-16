data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs_3 = slice(
    sort(data.aws_availability_zones.available.names),
    0,
    3
  )
}

module "vpc" {
  source = "./modules/vpc"

  name               = "${var.project_name}-${var.environment}-vpc"
  cidr               = "10.0.0.0/16"
  availability_zones = local.azs_3
}

data "aws_ssm_parameter" "app_db_username" {
  name            = "${var.project_ssm_ps_root_path}/db/username"
  with_decryption = true
}

data "aws_ssm_parameter" "app_db_password" {
  name            = "${var.project_ssm_ps_root_path}/db/password"
  with_decryption = true
}

module "rds" {
  source = "./modules/rds"

  name     = "${var.project_name}-${var.environment}-db"
  db_name  = var.project_name
  username = data.aws_ssm_parameter.app_db_username.value
  password = data.aws_ssm_parameter.app_db_password.value

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  allowed_security_group_ids = [
    module.auth_lambda.security_group_id,
    module.users_lambda.security_group_id,
    module.channels_lambda.security_group_id,
    module.messages_lambda.security_group_id,
    module.friends_lambda.security_group_id,
    module.games_lambda.security_group_id,
    module.migration_ecs.security_group_id,
  ]
}

# ─── Shared secrets ──────────────────────────────────────────────────────────

data "aws_ssm_parameter" "jwt_secret" {
  name            = "${var.project_ssm_ps_root_path}/jwt_secret"
  with_decryption = true
}

# ─── Auth Lambda ──────────────────────────────────────────────────────────────

data "aws_ssm_parameter" "auth_db_url" {
  name            = "${var.project_ssm_ps_root_path}/auth/database_url"
  with_decryption = true
}

data "aws_ssm_parameter" "auth_node_env" {
  name = "${var.project_ssm_ps_root_path}/auth/node_env"
}

data "aws_ssm_parameter" "auth_port" {
  name = "${var.project_ssm_ps_root_path}/auth/port"
}

data "aws_ssm_parameter" "auth_service_name" {
  name = "${var.project_ssm_ps_root_path}/auth/service_name"
}

locals {
  auth_environment = {
    DATABASE_URL      = data.aws_ssm_parameter.auth_db_url.value
    NODE_ENV          = data.aws_ssm_parameter.auth_node_env.value
    AUTH_PORT         = data.aws_ssm_parameter.auth_port.value
    AUTH_SERVICE_NAME = data.aws_ssm_parameter.auth_service_name.value
    JWT_SECRET        = data.aws_ssm_parameter.jwt_secret.value
  }
}

module "auth_lambda" {
  source = "./modules/lambda"

  name        = "${var.project_name}-${var.environment}-auth-lambda"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  filename    = "${path.root}/../../backend/dist/auth.zip"
  memory_size = 256
  timeout     = 10
  environment = local.auth_environment
}

# ─── Users Lambda ─────────────────────────────────────────────────────────────

data "aws_ssm_parameter" "users_db_url" {
  name            = "${var.project_ssm_ps_root_path}/users/database_url"
  with_decryption = true
}

data "aws_ssm_parameter" "users_node_env" {
  name = "${var.project_ssm_ps_root_path}/users/node_env"
}

data "aws_ssm_parameter" "users_port" {
  name = "${var.project_ssm_ps_root_path}/users/port"
}

data "aws_ssm_parameter" "users_service_name" {
  name = "${var.project_ssm_ps_root_path}/users/service_name"
}

locals {
  users_environment = {
    DATABASE_URL       = data.aws_ssm_parameter.users_db_url.value
    NODE_ENV           = data.aws_ssm_parameter.users_node_env.value
    USERS_PORT         = data.aws_ssm_parameter.users_port.value
    USERS_SERVICE_NAME = data.aws_ssm_parameter.users_service_name.value
    JWT_SECRET         = data.aws_ssm_parameter.jwt_secret.value
  }
}

module "users_lambda" {
  source = "./modules/lambda"

  name        = "${var.project_name}-${var.environment}-users-lambda"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  filename    = "${path.root}/../../backend/dist/users.zip"
  memory_size = 256
  timeout     = 10
  environment = local.users_environment
}

# ─── Channels Lambda ──────────────────────────────────────────────────────────

data "aws_ssm_parameter" "channels_db_url" {
  name            = "${var.project_ssm_ps_root_path}/channels/database_url"
  with_decryption = true
}

data "aws_ssm_parameter" "channels_node_env" {
  name = "${var.project_ssm_ps_root_path}/channels/node_env"
}

data "aws_ssm_parameter" "channels_port" {
  name = "${var.project_ssm_ps_root_path}/channels/port"
}

data "aws_ssm_parameter" "channels_service_name" {
  name = "${var.project_ssm_ps_root_path}/channels/service_name"
}

locals {
  channels_environment = {
    DATABASE_URL          = data.aws_ssm_parameter.channels_db_url.value
    NODE_ENV              = data.aws_ssm_parameter.channels_node_env.value
    CHANNELS_PORT         = data.aws_ssm_parameter.channels_port.value
    CHANNELS_SERVICE_NAME = data.aws_ssm_parameter.channels_service_name.value
    JWT_SECRET            = data.aws_ssm_parameter.jwt_secret.value
  }
}

module "channels_lambda" {
  source = "./modules/lambda"

  name        = "${var.project_name}-${var.environment}-channels-lambda"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  filename    = "${path.root}/../../backend/dist/channels.zip"
  memory_size = 256
  timeout     = 10
  environment = local.channels_environment
}

# ─── Messages Lambda ──────────────────────────────────────────────────────────

data "aws_ssm_parameter" "messages_db_url" {
  name            = "${var.project_ssm_ps_root_path}/messages/database_url"
  with_decryption = true
}

data "aws_ssm_parameter" "messages_node_env" {
  name = "${var.project_ssm_ps_root_path}/messages/node_env"
}

data "aws_ssm_parameter" "messages_port" {
  name = "${var.project_ssm_ps_root_path}/messages/port"
}

data "aws_ssm_parameter" "messages_service_name" {
  name = "${var.project_ssm_ps_root_path}/messages/service_name"
}

locals {
  messages_environment = {
    DATABASE_URL          = data.aws_ssm_parameter.messages_db_url.value
    NODE_ENV              = data.aws_ssm_parameter.messages_node_env.value
    MESSAGES_PORT         = data.aws_ssm_parameter.messages_port.value
    MESSAGES_SERVICE_NAME = data.aws_ssm_parameter.messages_service_name.value
    JWT_SECRET            = data.aws_ssm_parameter.jwt_secret.value
  }
}

module "messages_lambda" {
  source = "./modules/lambda"

  name        = "${var.project_name}-${var.environment}-messages-lambda"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  filename    = "${path.root}/../../backend/dist/messages.zip"
  memory_size = 256
  timeout     = 10
  environment = local.messages_environment
}

# ─── Friends Lambda ───────────────────────────────────────────────────────────

data "aws_ssm_parameter" "friends_db_url" {
  name            = "${var.project_ssm_ps_root_path}/friends/database_url"
  with_decryption = true
}

data "aws_ssm_parameter" "friends_node_env" {
  name = "${var.project_ssm_ps_root_path}/friends/node_env"
}

data "aws_ssm_parameter" "friends_port" {
  name = "${var.project_ssm_ps_root_path}/friends/port"
}

data "aws_ssm_parameter" "friends_service_name" {
  name = "${var.project_ssm_ps_root_path}/friends/service_name"
}

locals {
  friends_environment = {
    DATABASE_URL         = data.aws_ssm_parameter.friends_db_url.value
    NODE_ENV             = data.aws_ssm_parameter.friends_node_env.value
    FRIENDS_PORT         = data.aws_ssm_parameter.friends_port.value
    FRIENDS_SERVICE_NAME = data.aws_ssm_parameter.friends_service_name.value
    JWT_SECRET           = data.aws_ssm_parameter.jwt_secret.value
  }
}

module "friends_lambda" {
  source = "./modules/lambda"

  name        = "${var.project_name}-${var.environment}-friends-lambda"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  filename    = "${path.root}/../../backend/dist/friends.zip"
  memory_size = 256
  timeout     = 10
  environment = local.friends_environment
}

# ─── Games Lambda ─────────────────────────────────────────────────────────────

data "aws_ssm_parameter" "games_db_url" {
  name            = "${var.project_ssm_ps_root_path}/games/database_url"
  with_decryption = true
}

data "aws_ssm_parameter" "games_node_env" {
  name = "${var.project_ssm_ps_root_path}/games/node_env"
}

data "aws_ssm_parameter" "games_port" {
  name = "${var.project_ssm_ps_root_path}/games/port"
}

data "aws_ssm_parameter" "games_service_name" {
  name = "${var.project_ssm_ps_root_path}/games/service_name"
}

locals {
  games_environment = {
    DATABASE_URL        = data.aws_ssm_parameter.games_db_url.value
    NODE_ENV            = data.aws_ssm_parameter.games_node_env.value
    GAMES_PORT          = data.aws_ssm_parameter.games_port.value
    GAMES_SERVICE_NAME  = data.aws_ssm_parameter.games_service_name.value
    JWT_SECRET          = data.aws_ssm_parameter.jwt_secret.value
  }
}

module "games_lambda" {
  source = "./modules/lambda"

  name        = "${var.project_name}-${var.environment}-games-lambda"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  filename    = "${path.root}/../../backend/dist/games.zip"
  memory_size = 256
  timeout     = 10
  environment = local.games_environment
}

# ─── API Gateway ─────────────────────────────────────────────────────────────

module "http_api" {
  source = "./modules/api_gateway"

  name = "${var.project_name}-${var.environment}-http-api"
  lambda_integrations = {
    # Auth
    "POST /api/auth/register" = {
      function_name = module.auth_lambda.function_name
      invoke_arn    = module.auth_lambda.invoke_arn
    }
    "POST /api/auth/login" = {
      function_name = module.auth_lambda.function_name
      invoke_arn    = module.auth_lambda.invoke_arn
    }
    "POST /api/auth/refresh" = {
      function_name = module.auth_lambda.function_name
      invoke_arn    = module.auth_lambda.invoke_arn
    }
    "POST /api/auth/logout" = {
      function_name = module.auth_lambda.function_name
      invoke_arn    = module.auth_lambda.invoke_arn
    }
    "GET /api/auth/me" = {
      function_name = module.auth_lambda.function_name
      invoke_arn    = module.auth_lambda.invoke_arn
    }
    # Users
    "GET /api/users/me" = {
      function_name = module.users_lambda.function_name
      invoke_arn    = module.users_lambda.invoke_arn
    }
    "PATCH /api/users/me" = {
      function_name = module.users_lambda.function_name
      invoke_arn    = module.users_lambda.invoke_arn
    }
    "POST /api/users/me/heartbeat" = {
      function_name = module.users_lambda.function_name
      invoke_arn    = module.users_lambda.invoke_arn
    }
    "GET /api/users/presence" = {
      function_name = module.users_lambda.function_name
      invoke_arn    = module.users_lambda.invoke_arn
    }
    "GET /api/users/{userId}" = {
      function_name = module.users_lambda.function_name
      invoke_arn    = module.users_lambda.invoke_arn
    }
    # Channels
    "GET /api/channels" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "POST /api/channels/rooms" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "POST /api/channels/dm/{userId}" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "GET /api/channels/{channelId}" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "PATCH /api/channels/{channelId}" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "DELETE /api/channels/{channelId}" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "POST /api/channels/{channelId}/join" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "DELETE /api/channels/{channelId}/leave" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "GET /api/channels/{channelId}/members" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "DELETE /api/channels/{channelId}/members/{userId}" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "POST /api/channels/{channelId}/invites" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "GET /api/channels/invites" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "POST /api/channels/invites/{inviteId}/accept" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "POST /api/channels/invites/{inviteId}/decline" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    "PUT /api/channels/{channelId}/read" = {
      function_name = module.channels_lambda.function_name
      invoke_arn    = module.channels_lambda.invoke_arn
    }
    # Friends
    "GET /api/friends" = {
      function_name = module.friends_lambda.function_name
      invoke_arn    = module.friends_lambda.invoke_arn
    }
    "POST /api/friends/requests" = {
      function_name = module.friends_lambda.function_name
      invoke_arn    = module.friends_lambda.invoke_arn
    }
    "GET /api/friends/requests/incoming" = {
      function_name = module.friends_lambda.function_name
      invoke_arn    = module.friends_lambda.invoke_arn
    }
    "GET /api/friends/requests/outgoing" = {
      function_name = module.friends_lambda.function_name
      invoke_arn    = module.friends_lambda.invoke_arn
    }
    "PATCH /api/friends/requests/{requesterId}" = {
      function_name = module.friends_lambda.function_name
      invoke_arn    = module.friends_lambda.invoke_arn
    }
    "DELETE /api/friends/{friendId}" = {
      function_name = module.friends_lambda.function_name
      invoke_arn    = module.friends_lambda.invoke_arn
    }
    # Messages
    "GET /api/channels/{channelId}/messages" = {
      function_name = module.messages_lambda.function_name
      invoke_arn    = module.messages_lambda.invoke_arn
    }
    "POST /api/channels/{channelId}/messages" = {
      function_name = module.messages_lambda.function_name
      invoke_arn    = module.messages_lambda.invoke_arn
    }
    "PATCH /api/channels/{channelId}/messages/{messageId}" = {
      function_name = module.messages_lambda.function_name
      invoke_arn    = module.messages_lambda.invoke_arn
    }
    "DELETE /api/channels/{channelId}/messages/{messageId}" = {
      function_name = module.messages_lambda.function_name
      invoke_arn    = module.messages_lambda.invoke_arn
    }
    # Games
    "GET /api/games/solo" = {
      function_name = module.games_lambda.function_name
      invoke_arn    = module.games_lambda.invoke_arn
    }
    "POST /api/games/solo" = {
      function_name = module.games_lambda.function_name
      invoke_arn    = module.games_lambda.invoke_arn
    }
    "GET /api/games/channel/{channelId}" = {
      function_name = module.games_lambda.function_name
      invoke_arn    = module.games_lambda.invoke_arn
    }
    "POST /api/games/channel/{channelId}" = {
      function_name = module.games_lambda.function_name
      invoke_arn    = module.games_lambda.invoke_arn
    }
    "POST /api/games/{gameId}/join" = {
      function_name = module.games_lambda.function_name
      invoke_arn    = module.games_lambda.invoke_arn
    }
    "POST /api/games/{gameId}/move" = {
      function_name = module.games_lambda.function_name
      invoke_arn    = module.games_lambda.invoke_arn
    }
    "POST /api/games/{gameId}/forfeit" = {
      function_name = module.games_lambda.function_name
      invoke_arn    = module.games_lambda.invoke_arn
    }
  }
}

# ─── Frontend (S3) ────────────────────────────────────────────────────────────

module "frontend" {
  source = "./modules/frontend"

  name = "${var.project_name}-${var.environment}"
}

# ─── CloudFront Distribution ──────────────────────────────────────────────────

# Random secret CloudFront sends to API Gateway via X-Origin-Secret header.
# This obscures the API Gateway URL — direct requests without the header
# still hit JWT auth, but this adds a layer of obscurity.
resource "random_password" "origin_secret" {
  length  = 32
  special = false
}

module "cloudfront" {
  source = "./modules/cloudfront"

  name                           = "${var.project_name}-${var.environment}"
  s3_bucket_id                   = module.frontend.bucket_id
  s3_bucket_arn                  = module.frontend.bucket_arn
  s3_bucket_regional_domain_name = module.frontend.bucket_regional_domain_name
  api_gateway_url                = module.http_api.invoke_url
  api_origin_secret              = random_password.origin_secret.result

  # Ensure the S3 bucket and its public access block are fully applied
  # before CloudFront tries to attach the bucket policy.
  depends_on = [module.frontend]
}

# ─── Database migration ECS task ─────────────────────────────────────────────

data "aws_ssm_parameter" "migration_db_url" {
  name            = "${var.project_ssm_ps_root_path}/migration/database_url"
  with_decryption = true
}

locals {
  migration_secrets = [
    {
      name      = "DATABASE_URL"
      valueFrom = data.aws_ssm_parameter.migration_db_url.arn
    }
  ]
}

module "migration_ecs" {
  source = "./modules/ecs"

  name         = "${var.project_name}-${var.environment}-migration-ecs"
  region       = var.region
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids
  image        = var.image_uri
  secrets      = local.migration_secrets
  ssm_arn_url  = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${var.project_ssm_ps_root_path}/*"
  task_command = ["yarn", "prisma", "migrate", "deploy"]
}
