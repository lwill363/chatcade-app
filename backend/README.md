# Chatcade — Backend

Fastify 5 + TypeScript REST API, deployed as separate AWS Lambda functions per feature.

## Tech Stack

- **Runtime:** Node.js 22, TypeScript
- **Framework:** Fastify 5 with `fastify-type-provider-zod`
- **ORM:** Prisma 7 with `@prisma/adapter-pg` (PostgreSQL)
- **Auth:** JWT (`jsonwebtoken`) — 15-minute access tokens, 7-day refresh tokens with rotation
- **Passwords:** bcryptjs (12 rounds)
- **Validation:** Zod (shared between route schemas and DTOs)
- **Testing:** Vitest
- **Build:** tsup / esbuild (Lambda bundles)
- **Package manager:** Yarn 4

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Seeds required roles (user, admin)
│   └── migrations/
├── src/
│   ├── common/
│   │   ├── config/         # Base Zod config schema
│   │   ├── errors.ts       # APIError, UnauthorizedError, ForbiddenError, etc.
│   │   ├── middleware/     # authenticate() JWT preHandler
│   │   └── utils/         # Fastify app factory (build-app.ts)
│   └── features/
│       ├── auth/
│       ├── users/
│       ├── servers/
│       ├── channels/
│       └── messages/
└── .env.example
```

Each feature follows the same file structure:

| File | Purpose |
|---|---|
| `*-config.ts` | Extends base config schema, parses `process.env` |
| `*-types.ts` | Zod schemas + inferred TypeScript DTOs |
| `*-repository.ts` | Named functions wrapping all Prisma queries |
| `*-service.ts` | Business logic — imports `* as XRepository` |
| `*-controller.ts` | Request handlers — passes `request.server.prisma` to services |
| `*-routes.ts` | Route registration with Zod body schemas |
| `*-handler.ts` | AWS Lambda entry point (`createLambdaHandler`) |
| `*-server.ts` | Local dev entry point (plain Fastify listen) |

## Prerequisites

- Node.js 22
- Yarn 4 (`corepack enable`)
- PostgreSQL database

## Setup

```sh
# Install dependencies
yarn install

# Copy env and fill in values
cp .env.example .env

# Run migrations (roles are seeded automatically)
yarn prisma migrate dev

# Optional: populate with dev users, servers, and messages
yarn db:seed
```

Dev accounts created by the seed (all use password `password123`):

| Email | Username | Role |
|---|---|---|
| `admin@chatcade.dev` | `admin` | admin |
| `alice@chatcade.dev` | `alice` | user |
| `bob@chatcade.dev` | `bob` | user |

### Environment Variables

All services share a single `.env` file. Each service reads only its own prefixed variables.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 characters) |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `AUTH_PORT` | Port for the auth service (default `3001`) |
| `USERS_PORT` | Port for the users service (default `3005`) |
| `SERVERS_PORT` | Port for the servers service (default `3002`) |
| `CHANNELS_PORT` | Port for the channels service (default `3003`) |
| `MESSAGES_PORT` | Port for the messages service (default `3004`) |
| `AUTH_SERVICE_NAME` | Service name sentinel for auth (`auth`) |
| `USERS_SERVICE_NAME` | Service name sentinel for users (`users`) |
| `SERVERS_SERVICE_NAME` | Service name sentinel for servers (`servers`) |
| `CHANNELS_SERVICE_NAME` | Service name sentinel for channels (`channels`) |
| `MESSAGES_SERVICE_NAME` | Service name sentinel for messages (`messages`) |

## Running Locally

Each feature runs as a separate HTTP server. Open one terminal per service:

```sh
yarn dev:auth       # http://localhost:3001
yarn dev:users      # http://localhost:3005
yarn dev:servers    # http://localhost:3002
yarn dev:channels   # http://localhost:3003
yarn dev:messages   # http://localhost:3004
```

## API Reference

All protected routes require `Authorization: Bearer <accessToken>`.

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | Log in, get access + refresh tokens |
| POST | `/auth/refresh` | — | Rotate refresh token, get new access token |
| POST | `/auth/logout` | — | Invalidate refresh token |
| GET | `/auth/me` | ✓ | Get current user |

### Users — `/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | ✓ | Get own full profile |
| PATCH | `/users/me` | ✓ | Update username |
| GET | `/users/:userId` | ✓ | Get public profile |

### Servers — `/servers`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/servers` | ✓ | Create server (auto-joins owner, creates #general) |
| GET | `/servers` | ✓ | List servers you're a member of |
| GET | `/servers/:serverId` | ✓ | Get server details |
| PATCH | `/servers/:serverId` | ✓ (owner) | Update name/description |
| DELETE | `/servers/:serverId` | ✓ (owner) | Delete server |
| POST | `/servers/:serverId/join` | ✓ | Join server |
| DELETE | `/servers/:serverId/leave` | ✓ | Leave server |
| GET | `/servers/:serverId/members` | ✓ | List members |
| DELETE | `/servers/:serverId/members/:userId` | ✓ (owner) | Kick member |

### Channels — `/servers/:serverId/channels` and `/channels`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/servers/:serverId/channels` | ✓ (owner) | Create channel |
| GET | `/servers/:serverId/channels` | ✓ (member) | List channels |
| GET | `/channels/:channelId` | ✓ (member) | Get channel |
| PATCH | `/channels/:channelId` | ✓ (owner) | Update name/topic |
| DELETE | `/channels/:channelId` | ✓ (owner) | Delete channel |

### Messages — `/channels/:channelId/messages` and `/messages`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/channels/:channelId/messages` | ✓ (member) | Send message |
| GET | `/channels/:channelId/messages` | ✓ (member) | List messages (cursor pagination) |
| PATCH | `/messages/:messageId` | ✓ (author) | Edit message |
| DELETE | `/messages/:messageId` | ✓ (author/owner) | Delete message |

**Pagination query params:** `limit` (1–100, default 50), `before` (message UUID cursor)

## Database Schema

```
Role        — id, name, description
User        — id, username, emailAddress, passwordHash, roleId
RefreshToken — id, token, userId, expiresAt
Server      — id, name, description, ownerId
ServerMember — serverId + userId (unique pair), joinedAt
Channel     — id, name, topic, serverId
Message     — id, content (max 2000), channelId, authorId, editedAt
```

## Architecture Notes

- **Repository pattern:** Each feature has a `*-repository.ts` that exports individual named functions (e.g., `export function findById(prisma, id)`). Services import them as `import * as AuthRepository from "..."` and pass `prisma` as the first argument.
- **Config isolation:** Each Lambda only loads the env vars it needs via its own Zod config schema.
- **Error handling:** Centralized error handler in `build-app.ts` with three tiers: (1) Zod schema validation errors → 400 with structured `details` per field (`field`, `message`, `keyword`, `params`); (2) `APIError` subclasses → their respective HTTP status codes; (3) Fastify built-in errors (malformed JSON, payload too large, etc.) → their native status codes. Unhandled errors fall back to 500 and log the full stack trace via pino.

## Building for Production

```sh
# Build all Lambda bundles (also run by CI)
yarn build

# Or bundle a single feature with esbuild
yarn dlx esbuild src/features/auth/auth-handler.ts \
  --bundle --platform=node --target=node22 \
  --outfile=dist/auth/index.js
```

## Testing

```sh
yarn test
yarn test:watch
```
