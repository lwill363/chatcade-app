# Chatcade — Backend

Fastify 5 + TypeScript REST API deployed as separate AWS Lambda functions per feature, plus a WebSocket API for real-time events.

## Tech Stack

- **Runtime:** Node.js 24, TypeScript
- **Framework:** Fastify 5 with `fastify-type-provider-zod`
- **ORM:** Prisma 7 with `@prisma/adapter-pg` (PostgreSQL)
- **Auth:** JWT (`jsonwebtoken`) — 15-minute access tokens, 7-day refresh tokens with rotation
- **Passwords:** bcryptjs (12 rounds)
- **Validation:** Zod (shared between route schemas and DTOs)
- **Real-time:** AWS API Gateway WebSocket API + `@aws-sdk/client-apigatewaymanagementapi`
- **Testing:** Vitest
- **Package manager:** Yarn 4

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Seeds roles + dev users
│   └── migrations/
└── src/
    ├── common/
    │   ├── config/         # Base Zod config schema (NODE_ENV)
    │   ├── errors.ts       # APIError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError
    │   ├── middleware/     # authenticate() JWT preHandler
    │   └── utils/          # build-app.ts (Fastify factory), createLambdaHandler
    └── features/
        ├── auth/           # register, login, refresh, logout, /auth/me
        ├── users/          # GET/PATCH /users/me, GET /users/:id, DELETE /users/me
        ├── channels/       # rooms + DMs + membership + read tracking
        ├── messages/       # send, list, edit, delete
        ├── friends/        # friend requests, accept/decline, remove
        ├── games/          # TicTacToe (solo vs bot + multiplayer)
        └── websocket/      # connect, disconnect, default route handlers
```

Each feature follows the same file structure:

| File | Purpose |
|---|---|
| `*-config.ts` | Extends base config schema, parses `process.env` |
| `*-types.ts` | Zod schemas + inferred TypeScript DTOs |
| `*-repository.ts` | Named functions wrapping all Prisma queries |
| `*-service.ts` | Business logic — pure functions, takes prisma client |
| `*-controller.ts` | Request handlers |
| `*-routes.ts` | Route registration with Zod schemas |
| `*-handler.ts` | AWS Lambda entry point (`createLambdaHandler`) |
| `*-server.ts` | Local dev entry point (Fastify listen) |

## Prerequisites

- Node.js 24
- Yarn 4 (`corepack enable`)
- PostgreSQL database

## Setup

```sh
yarn install
cp .env.example .env    # fill in DATABASE_URL and JWT_SECRET
yarn prisma migrate dev  # runs migrations + seeds required roles
yarn db:seed             # optional: populates dev users and sample data
```

Dev accounts (password: `password123`):

| Email | Username | Role |
|---|---|---|
| `alice@chatcade.dev` | `alice` | user |
| `bob@chatcade.dev` | `bob` | user |

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 characters) |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `AUTH_PORT` | Port for auth service (default `3001`) |
| `USERS_PORT` | Port for users service (default `3002`) |
| `CHANNELS_PORT` | Port for channels service (default `3003`) |
| `MESSAGES_PORT` | Port for messages service (default `3004`) |
| `FRIENDS_PORT` | Port for friends service (default `3005`) |
| `GAMES_PORT` | Port for games service (default `3006`) |

## Running Locally

```sh
yarn dev:auth        # http://localhost:3001
yarn dev:users       # http://localhost:3002
yarn dev:channels    # http://localhost:3003
yarn dev:messages    # http://localhost:3004
yarn dev:friends     # http://localhost:3005
yarn dev:games       # http://localhost:3006
```

Note: The WebSocket handlers run as AWS Lambda functions and cannot be run locally without a full AWS environment.

## API Reference

All protected routes require `Authorization: Bearer <accessToken>`.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Log in, get access + refresh tokens |
| POST | `/api/auth/refresh` | — | Rotate refresh token, get new access token |
| POST | `/api/auth/logout` | — | Invalidate refresh token |
| GET | `/api/auth/me` | ✓ | Get current user |

### Users — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | ✓ | Get own full profile |
| PATCH | `/api/users/me` | ✓ | Update username / display name / bio |
| DELETE | `/api/users/me` | ✓ | Delete account (transfers owned rooms or deletes them) |
| GET | `/api/users/:userId` | ✓ | Get public profile |

### Channels — `/api/channels`

Channels are the unified model for both Rooms (group chats) and Direct Messages.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/channels` | ✓ | List all channels (rooms + DMs) with unread counts |
| POST | `/api/channels/rooms` | ✓ | Create a room |
| POST | `/api/channels/dms` | ✓ | Open a DM with another user |
| GET | `/api/channels/:channelId` | ✓ | Get channel details |
| PATCH | `/api/channels/:channelId` | ✓ (owner) | Update room name/description |
| DELETE | `/api/channels/:channelId` | ✓ (owner) | Delete room |
| GET | `/api/channels/:channelId/members` | ✓ | List room members |
| POST | `/api/channels/:channelId/join` | ✓ | Join a room |
| DELETE | `/api/channels/:channelId/leave` | ✓ | Leave a room |
| DELETE | `/api/channels/:channelId/members/:userId` | ✓ (owner) | Kick member |
| POST | `/api/channels/:channelId/read` | ✓ | Mark channel as read |

### Messages — `/api/channels/:channelId/messages`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/channels/:channelId/messages` | ✓ (member) | Send message |
| GET | `/api/channels/:channelId/messages` | ✓ (member) | List messages (cursor pagination) |
| PATCH | `/api/channels/:channelId/messages/:messageId` | ✓ (author) | Edit message |
| DELETE | `/api/channels/:channelId/messages/:messageId` | ✓ (author/owner) | Delete message |

Pagination params: `limit` (1–100, default 50), `before` (message UUID cursor)

### Friends — `/api/friends`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/friends` | ✓ | List friends and pending requests |
| POST | `/api/friends/requests` | ✓ | Send a friend request |
| PATCH | `/api/friends/requests/:requestId` | ✓ | Accept or decline a request |
| DELETE | `/api/friends/:friendshipId` | ✓ | Remove a friend |

### Games — `/api/games`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/games` | ✓ | Create a game session |
| GET | `/api/games/:gameId` | ✓ | Get game state |
| POST | `/api/games/:gameId/moves` | ✓ | Submit a move |
| DELETE | `/api/games/:gameId` | ✓ | Forfeit a game |

## Database Schema

```
Role          — id, name, description
User          — id, username, email, passwordHash, displayName, bio, roleId
RefreshToken  — id, token, userId, expiresAt
Channel       — id, type (ROOM | DIRECT), name, description, ownerId
ChannelMember — channelId + userId, lastReadAt, joinedAt
Message       — id, content, channelId, authorId (nullable), editedAt
Friendship    — id, requesterId, addresseeId, status (PENDING|ACCEPTED|DECLINED)
GameSession   — id, type, status, state (JSON), player1Id, player2Id (nullable), winnerId
```

## Architecture Notes

- **Repository pattern:** Each feature's `*-repository.ts` exports named functions (e.g., `findById(prisma, id)`). Services import as `import * as ChannelsRepository` and pass `prisma` as the first argument, keeping business logic pure and independently testable.
- **Config isolation:** Each Lambda reads only its own env vars via a Zod config schema that extends the base schema.
- **Error handling:** Centralized in `build-app.ts` — Zod validation errors → 400 with structured field details; `APIError` subclasses → their HTTP codes; unhandled → 500 with pino stack trace.
- **WebSocket presence:** Connection records stored in the DB. On connect, the user's online status is broadcast to all connections. On disconnect (or stale connection cleanup via EventBridge), offline status is broadcast. Ping/pong keepalive prevents idle connection drops.
- **Deleted user messages:** `Message.authorId` is nullable. When an account is deleted, existing messages set `authorId = null` and render as "Deleted User" in the UI rather than being removed.

## Testing

```sh
yarn test          # run once
yarn test:watch    # watch mode
```
