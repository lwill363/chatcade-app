# Chatcade

A real-time multiplayer platform — WebSocket presence system, rooms and DMs, friends, and a game hub. Built on a serverless microservice architecture deployed to AWS.

## Architecture Overview

```
Browser
  │
  ├── HTTP (REST)  →  CloudFront  →  API Gateway v2  →  Lambda per feature
  └── WebSocket    →  API Gateway v2 (WebSocket)      →  Lambda (connect/disconnect/default)
                                                            │
                                               RDS PostgreSQL (Prisma)
```

Each backend feature runs as its own AWS Lambda function. The WebSocket API handles real-time events (presence, message delivery, game state) independently from the REST API.

## Monorepo Structure

```
chat-minigames-hub/
├── backend/       # Fastify API — one Lambda per feature + WebSocket handlers
├── frontend/      # React SPA (S3 + CloudFront)
└── infra/         # Terraform — all AWS infrastructure
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Fastify 5, TypeScript, Prisma 7, PostgreSQL |
| Auth | JWT (15m access tokens) + bcryptjs, refresh token rotation |
| Real-time | AWS API Gateway WebSocket API — presence, message delivery, game state |
| Frontend | React 19, Redux Toolkit + RTK Query, Vite 6, Tailwind CSS v4 |
| Infrastructure | AWS Lambda, API Gateway v2 (HTTP + WebSocket), RDS PostgreSQL, S3 + CloudFront, VPC |
| CI/CD | GitHub Actions → unit tests → Terraform → Playwright E2E |
| Package manager | Yarn 4 |

## Features

- **Auth** — register, login, JWT refresh rotation, logout
- **Rooms** — create, join/leave, manage members, kick, read tracking
- **Direct Messages** — open a DM with any user
- **Messages** — send, edit, delete, cursor-based pagination, real-time delivery via WebSocket
- **Friends** — send/accept/decline friend requests, remove friends
- **Presence** — live online/offline indicators via WebSocket, multi-tab aware
- **Games** — TicTacToe with solo (vs bot, difficulty levels) and multiplayer modes
- **Users** — public profiles, account settings, account deletion

## Getting Started

**Prerequisites:** Node.js 24, Yarn 4 (`corepack enable`), PostgreSQL

```sh
# 1. Set up the database
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET
yarn install
yarn prisma migrate dev   # runs migrations + seeds required roles
yarn db:seed              # optional: adds dev users and sample data

# 2. Run backend services (each in a separate terminal)
yarn dev:auth        # :3001
yarn dev:users       # :3002
yarn dev:channels    # :3003
yarn dev:messages    # :3004
yarn dev:friends     # :3005
yarn dev:games       # :3006

# 3. Run the frontend
cd ../frontend
yarn install
yarn dev             # :5173
```

Dev accounts created by seed (password: `password123`):

| Email | Username |
|---|---|
| `alice@chatcade.dev` | `alice` |
| `bob@chatcade.dev` | `bob` |

## Database Schema

```
Role ←── User ──→ RefreshToken
          │
          ├──→ ChannelMember ──→ Channel (ROOM | DIRECT)
          │                          │
          │                          └──→ Message
          │
          ├──→ Friendship
          │
          └──→ GameSession ──→ GameMove
```

## CI/CD Pipeline

Pushing to `main` triggers the GitHub Actions pipeline:

1. Run backend unit tests (Vitest)
2. Run frontend unit tests (Vitest)
3. Build and push Docker image to ECR (for migrations)
4. Bundle each Lambda with esbuild and package as `.zip`
5. `terraform apply` — deploy all infrastructure changes
6. Build React SPA, sync to S3, invalidate CloudFront cache
7. Run Prisma migrations via ECS Fargate task
8. Run Playwright E2E tests against the live deployed URL
