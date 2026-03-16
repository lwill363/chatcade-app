# Chatcade

A Discord-lite real-time chat application. Users can create servers, organize conversations into channels, and message each other.

## Monorepo Structure

```
chat-minigames-hub/
├── backend/       # Fastify API — one AWS Lambda per feature
├── frontend/      # React SPA
└── infra/         # Terraform infrastructure (AWS)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Fastify 5, TypeScript, Prisma 7, PostgreSQL |
| Auth | JWT (15m access tokens) + bcryptjs, refresh token rotation |
| Frontend | React 19, Redux Toolkit, Vite 6, Tailwind CSS v4 |
| Infrastructure | AWS Lambda, API Gateway v2, RDS PostgreSQL, S3 + CloudFront, VPC |
| CI/CD | GitHub Actions → Terraform |
| Package manager | Yarn 4 (both backend and frontend) |

## Features

- **Auth** — register, login, JWT refresh, logout
- **Servers** — create, join/leave, manage members, kick
- **Channels** — text channels scoped to servers, owner-managed
- **Messages** — send, edit, delete, cursor-based pagination
- **Users** — public profiles, username updates

## Getting Started

Each sub-project has its own README with full setup instructions:

- [Backend →](./backend/README.md)
- [Frontend →](./frontend/README.md)
- [Infrastructure →](./infra/README.md)

### Quick Start (Local Development)

**Prerequisites:** Node.js 22, Yarn 4, PostgreSQL

```sh
# 1. Set up the database
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET
yarn install
yarn prisma migrate dev   # runs migrations + seeds required roles automatically
yarn db:seed              # optional: adds dev users, servers, and messages

# 2. Run backend services (each in a separate terminal)
yarn dev:auth       # :3001
yarn dev:users      # :3005
yarn dev:servers    # :3002
yarn dev:channels   # :3003
yarn dev:messages   # :3004

# 3. Run the frontend
cd ../frontend
cp .env.example .env
yarn install
yarn dev            # :5173
```

## Database Schema

```
Role ←── User ──→ RefreshToken
           │
           ├──→ Server ──→ ServerMember
           │       │
           │       └──→ Channel ──→ Message
           │
           └──→ Message (author)
```

## CI/CD

Pushing to `main` triggers the GitHub Actions pipeline which:

1. Builds and pushes a Docker image to ECR (for migrations)
2. Bundles each Lambda with esbuild and packages it as a `.zip`
3. Runs `terraform apply` to deploy infrastructure changes
4. Builds the React frontend and syncs it to S3; invalidates the CloudFront cache
5. Runs Prisma migrations via an ECS Fargate task
