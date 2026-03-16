#!/usr/bin/env bash
# Creates (or overwrites) all SSM Parameter Store entries required by Chatcade.
# Safe to re-run any time values change — existing parameters are overwritten.
#
# This is an infrastructure-owner script — developers do not need to run it.
#
# Usage:
#   cd infra/scripts
#   cp .env.ssm.example .env.ssm   # fill in values
#   chmod +x create-ssm-params.sh
#   ./create-ssm-params.sh
#   rm .env.ssm                    # optional: delete after use

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.ssm"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
  echo "Loaded values from .env.ssm"
else
  echo "Error: .env.ssm not found."
  echo "Copy .env.ssm.example to .env.ssm and fill in your values."
  exit 1
fi

# Validate required variables are set and non-empty
required_vars=(DB_USERNAME DB_PASSWORD JWT_SECRET DATABASE_URL
               AUTH_PORT USERS_PORT CHANNELS_PORT MESSAGES_PORT FRIENDS_PORT
               AUTH_SERVICE_NAME USERS_SERVICE_NAME
               CHANNELS_SERVICE_NAME MESSAGES_SERVICE_NAME FRIENDS_SERVICE_NAME)
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Error: $var is not set in .env.ssm"
    exit 1
  fi
done

ENV="${CHATCADE_ENV:-prod}"
REGION="${AWS_REGION:-us-east-1}"
NODE_ENV="${NODE_ENV:-production}"
ROOT="/chatcade/$ENV"

echo ""
echo "Creating SSM parameters under $ROOT in $REGION (NODE_ENV=$NODE_ENV)..."
echo ""

# Helper — creates a String or SecureString parameter (overwrites if exists)
put() {
  local name="$1"
  local value="$2"
  local type="${3:-String}"
  aws ssm put-parameter \
    --name "$name" \
    --value "$value" \
    --type "$type" \
    --overwrite \
    --region "$REGION" \
    --no-cli-pager > /dev/null
  echo "  ✓ $name"
}

# ─── Shared ───────────────────────────────────────────────────────────────────
put "$ROOT/db/username"  "$DB_USERNAME"  SecureString
put "$ROOT/db/password"  "$DB_PASSWORD"  SecureString
put "$ROOT/jwt_secret"   "$JWT_SECRET"   SecureString

# ─── Auth ─────────────────────────────────────────────────────────────────────
put "$ROOT/auth/database_url"  "$DATABASE_URL"  SecureString
put "$ROOT/auth/node_env"      "$NODE_ENV"
put "$ROOT/auth/port"          "$AUTH_PORT"
put "$ROOT/auth/service_name"  "$AUTH_SERVICE_NAME"

# ─── Users ────────────────────────────────────────────────────────────────────
put "$ROOT/users/database_url"  "$DATABASE_URL"  SecureString
put "$ROOT/users/node_env"      "$NODE_ENV"
put "$ROOT/users/port"          "$USERS_PORT"
put "$ROOT/users/service_name"  "$USERS_SERVICE_NAME"

# ─── Channels ─────────────────────────────────────────────────────────────────
put "$ROOT/channels/database_url"  "$DATABASE_URL"  SecureString
put "$ROOT/channels/node_env"      "$NODE_ENV"
put "$ROOT/channels/port"          "$CHANNELS_PORT"
put "$ROOT/channels/service_name"  "$CHANNELS_SERVICE_NAME"

# ─── Messages ─────────────────────────────────────────────────────────────────
put "$ROOT/messages/database_url"  "$DATABASE_URL"  SecureString
put "$ROOT/messages/node_env"      "$NODE_ENV"
put "$ROOT/messages/port"          "$MESSAGES_PORT"
put "$ROOT/messages/service_name"  "$MESSAGES_SERVICE_NAME"

# ─── Friends ──────────────────────────────────────────────────────────────────
put "$ROOT/friends/database_url"  "$DATABASE_URL"  SecureString
put "$ROOT/friends/node_env"      "$NODE_ENV"
put "$ROOT/friends/port"          "$FRIENDS_PORT"
put "$ROOT/friends/service_name"  "$FRIENDS_SERVICE_NAME"

# ─── Games ──────────────────────────────────────────────────────────────────
put "$ROOT/games/database_url"  "$DATABASE_URL"  SecureString
put "$ROOT/games/node_env"      "$NODE_ENV"
put "$ROOT/games/port"          "$GAMES_PORT"
put "$ROOT/games/service_name"  "$GAMES_SERVICE_NAME"

# ─── Migration ────────────────────────────────────────────────────────────────
put "$ROOT/migration/database_url"  "$DATABASE_URL"  SecureString

echo ""
echo "Done — $(aws ssm describe-parameters \
  --parameter-filters "Key=Path,Option=Recursive,Values=$ROOT" \
  --query 'length(Parameters)' \
  --region "$REGION" \
  --output text) parameters set under $ROOT"
