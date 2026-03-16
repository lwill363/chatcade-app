# Chatcade — Infrastructure

Terraform configuration for deploying Chatcade to AWS. The stack uses one Lambda function per backend feature behind a single HTTP API Gateway, backed by a managed PostgreSQL RDS instance inside a private VPC.

## Architecture

```
Browser
    │
    ├──▶ CloudFront (HTTPS, CDN, SPA routing)
    │         │ Origin Access Control
    │         ▼
    │      S3 Bucket (static assets — dist/)
    │
    └──▶ API Gateway v2 (HTTP API)
              │  Routes: /auth/*, /users/*, /servers/*, /channels/*, /messages/*
              │
              ├──▶ Auth Lambda        ┐
              ├──▶ Users Lambda       │
              ├──▶ Servers Lambda     ├── Private subnets (VPC)
              ├──▶ Channels Lambda    │
              └──▶ Messages Lambda    ┘
                        │
                        ▼
                  RDS PostgreSQL (private subnet)
                        ▲
                        │
              Migration ECS Task (Fargate) — runs on deploy
```

All config and secrets are loaded from **SSM Parameter Store** at deploy time — no secrets in code or Terraform state.

## AWS Services Used

| Service | Purpose |
|---|---|
| CloudFront | CDN + HTTPS termination + SPA client-side routing |
| S3 | Static asset hosting for the React frontend (`dist/`) |
| API Gateway v2 | HTTP API — routes to Lambda integrations |
| Lambda (Node.js 22) | One function per feature (auth, users, servers, channels, messages) |
| RDS (PostgreSQL) | Managed relational database in private subnets |
| VPC | Isolated network with public + private subnets across 3 AZs |
| ECS Fargate | Runs Prisma migrations on each deploy |
| ECR | Docker image registry (migration task image) |
| SSM Parameter Store | Secrets and per-service environment config |
| IAM | Lambda execution roles, GitHub OIDC role |

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) ≥ 1.5
- AWS CLI configured with credentials that have permission to create the above resources
- An S3 bucket and DynamoDB table for Terraform remote state (update `backend.tf` or use local state for testing)

## SSM Parameters Required

All parameters live under the path `/chatcade/prod/`. Create them in SSM Parameter Store (SecureString for secrets) before running `terraform apply`:

```
/chatcade/prod/db/username
/chatcade/prod/db/password
/chatcade/prod/jwt_secret

# Per-service config
/chatcade/prod/auth/database_url
/chatcade/prod/auth/node_env
/chatcade/prod/auth/port
/chatcade/prod/auth/service_name

/chatcade/prod/users/database_url
/chatcade/prod/users/node_env
/chatcade/prod/users/port
/chatcade/prod/users/service_name

/chatcade/prod/servers/database_url
/chatcade/prod/servers/node_env
/chatcade/prod/servers/port
/chatcade/prod/servers/service_name

/chatcade/prod/channels/database_url
/chatcade/prod/channels/node_env
/chatcade/prod/channels/port
/chatcade/prod/channels/service_name

/chatcade/prod/messages/database_url
/chatcade/prod/messages/node_env
/chatcade/prod/messages/port
/chatcade/prod/messages/service_name

/chatcade/prod/migration/database_url
```

Use the bulk-create script to set all parameters at once:

```sh
cd infra/scripts
cp .env.ssm.example .env.ssm   # fill in values
./create-ssm-params.sh
rm .env.ssm                    # delete after use
```

## Deploying Manually

```sh
cd infra/terraform

# 1. Initialise providers and remote state
terraform init

# 2. Preview changes
terraform plan -var="image_uri=<ECR_IMAGE_URI>"

# 3. Apply
terraform apply -var="image_uri=<ECR_IMAGE_URI>"
```

`image_uri` is the ECR URI of the Docker image used by the ECS migration task (e.g. `123456789.dkr.ecr.us-east-1.amazonaws.com/chatcade:chatcade-<sha>`).

## Terraform Modules

```
infra/terraform/
├── main.tf             # Top-level resources (VPC, RDS, Lambdas, API Gateway, Frontend)
├── variables.tf        # Input variables
├── outputs.tf          # Exported values (URLs, bucket name, subnet IDs, etc.)
└── modules/
    ├── vpc/            # VPC, public + private subnets, NAT gateway
    ├── rds/            # RDS PostgreSQL instance + security group
    ├── lambda/         # Lambda function + execution role + security group
    ├── api_gateway/    # HTTP API Gateway + Lambda integrations + CORS
    ├── frontend/       # S3 bucket + CloudFront distribution + OAC + bucket policy
    └── ecs/            # ECS cluster + Fargate task definition (migrations)
```

## CI/CD (GitHub Actions)

The [deploy workflow](../.github/workflows/deploy.yml) runs automatically on every push to `main`:

1. **Authenticate** to AWS via OIDC (no long-lived credentials stored in GitHub)
2. **Build & push** a Docker image for the migration task to ECR
3. **Bundle Lambdas** — `esbuild` bundles each `*-handler.ts` into a zip, auto-discovered with `find src/features -name "*-handler.ts"`
4. **Terraform plan → apply** — deploys infrastructure changes (including S3 bucket and CloudFront)
5. **Build frontend** — `yarn build` with `VITE_API_BASE_URL` injected from the API Gateway URL output
6. **Deploy frontend** — `aws s3 sync` uploads `dist/` to S3, then a CloudFront cache invalidation ensures users get the latest assets
7. **Run migrations** — triggers an ECS Fargate task that runs `prisma migrate deploy`

> **IAM note:** The `GitHubTerraformRole` must include `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on the frontend bucket and `cloudfront:CreateInvalidation` on the distribution for steps 5–6 to succeed.

### Required GitHub Repository Secrets / Variables

| Name | Where | Description |
|---|---|---|
| AWS OIDC role ARN | Hardcoded in workflow | IAM role assumed via GitHub OIDC |
| `AWS_REGION` | Workflow env | `us-east-1` |

The workflow uses OIDC federation — no `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` secrets are needed. The IAM role (`GitHubTerraformRole`) must have a trust policy allowing `token.actions.githubusercontent.com`.

## Variables

| Variable | Default | Description |
|---|---|---|
| `project_name` | `chatcade` | Used as a prefix for all resource names |
| `environment` | `prod` | Deployment environment |
| `project_ssm_ps_root_path` | `/chatcade/prod` | SSM Parameter Store root path |
| `image_uri` | — | ECR image URI for the migration ECS task |

## Outputs

| Output | Description |
|---|---|
| `frontend_url` | Public CloudFront HTTPS URL for the React app |
| `api_gateway_url` | API Gateway invoke URL (used as `VITE_API_BASE_URL` at build time) |
| `frontend_bucket` | S3 bucket name for the frontend assets |
| `frontend_distribution_id` | CloudFront distribution ID (used for cache invalidation) |
