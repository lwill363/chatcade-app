# Chatcade — Frontend

React SPA for Chatcade — real-time chat, friends, and a game hub.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build tool:** Vite 6
- **State management:** Redux Toolkit 2 with RTK Query (API caching + mutations)
- **Routing:** React Router 7
- **Forms:** React Hook Form + Zod validation
- **Styling:** Tailwind CSS v4 (CSS-based config via `@tailwindcss/vite`)
- **Real-time:** Native WebSocket with exponential backoff reconnect, ping/pong keepalive
- **Testing:** Vitest (unit + component), Playwright (E2E)
- **Package manager:** Yarn 4

## Project Structure

```
frontend/
├── index.html
├── vite.config.ts          # Vite proxy + path aliases
├── playwright.config.ts    # E2E test config
└── src/
    ├── main.tsx            # App entry — session restore on load
    ├── App.tsx
    ├── index.css           # Tailwind import + base styles
    ├── app/
    │   ├── store.ts        # Redux store
    │   └── hooks.ts        # Typed useAppDispatch / useAppSelector
    ├── services/
    │   ├── api.ts          # RTK Query base — auto token refresh on 401
    │   └── websocket.ts    # WebSocket client — reconnect, ping/pong, event dispatch
    ├── features/
    │   ├── auth/           # authSlice + authApi
    │   ├── channels/       # channelsApi (rooms + DMs)
    │   ├── messages/       # messagesApi
    │   ├── friends/        # friendsApi
    │   ├── games/          # game state + engine (TicTacToe)
    │   └── ui/             # uiSlice (selectedChannel, showMembersSidebar)
    ├── components/
    │   ├── ui/             # Button, Input, Modal, Spinner, Avatar
    │   ├── layout/         # Sidebar, MembersSidebar, AppLayout
    │   ├── chat/           # ChannelView, MessageList, MessageItem, MessageInput
    │   ├── games/          # TicTacToe board + game hub
    │   └── modals/         # CreateRoomModal, NewMessageModal, UserSettingsModal
    ├── pages/
    │   ├── LoginPage.tsx
    │   └── RegisterPage.tsx
    └── router/
        ├── index.tsx
        └── ProtectedRoute.tsx
```

## Setup

**Prerequisites:** Node.js 24, Yarn 4 (`corepack enable`)

```sh
yarn install
yarn dev    # http://localhost:5173
```

The backend services must be running first — see the [backend README](../backend/README.md).

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_WS_URL` | WebSocket API URL (`wss://...`). Required for production builds. Not needed in local dev. |

In production, `VITE_WS_URL` is injected automatically by the CI/CD pipeline from the Terraform output.

## Local Development

The Vite dev server proxies API requests to the backend services:

| Prefix | Backend service | Port |
|---|---|---|
| `/api/auth` | auth | 3001 |
| `/api/users` | users | 3002 |
| `/api/channels` | channels | 3003 |
| `/api/channels/:id/messages` | messages | 3004 |
| `/api/friends` | friends | 3005 |
| `/api/games` | games | 3006 |

WebSocket connections in local dev point directly to the backend (not proxied). The WebSocket handler only runs as a Lambda in AWS.

## UI Layout

```
┌─────────────────────────────────────────────────┐
│ Sidebar (240px)  │  Channel View                 │
│                  │                               │
│  Direct Messages │  Message history              │
│  Rooms           │  ──────────────────────       │
│  ──────────────  │  Message input                │
│  [Games tab]     │                               │
│                  │               [Members (opt)] │
│  ──────────────  │                               │
│  [User / Settings] │                             │
└─────────────────────────────────────────────────┘
```

- **Sidebar** — DMs (with unread counts), Rooms, Games hub tab, user info + settings at the bottom
- **Channel view** — message history with cursor-based scroll pagination, inline edit/delete, real-time delivery
- **Members sidebar** — toggleable panel, shows all room members
- **Games hub** — TicTacToe with solo (vs bot) and multiplayer modes

## Auth Flow

1. On login/register, `accessToken` is stored in Redux (in-memory); `refreshToken` is persisted to `localStorage` under `chatcade_refresh_token`.
2. On page load, `main.tsx` checks for a stored refresh token and exchanges it for a new access token, restoring the session without a login prompt.
3. RTK Query's base query attaches `Authorization: Bearer <accessToken>` to every request.
4. On a `401`, the base query transparently refreshes the token and retries. If refresh fails, the user is logged out.

## Real-time (WebSocket)

The WebSocket client in `services/websocket.ts` connects after login and handles:

- **Presence** — broadcasts user online/offline status; online indicators shown throughout the UI
- **Messages** — new/edit/delete events trigger RTK Query cache invalidations for instant UI updates
- **Games** — game state updates pushed to both players in multiplayer sessions

Reconnect uses exponential backoff (1s → 30s cap). Ping/pong keepalive prevents idle disconnects. Multiple tabs share the same underlying connection via a ref-counted connection manager.

## Testing

```sh
# Unit + component tests
yarn test          # run once
yarn test:watch    # watch mode

# E2E tests (requires a running app — local or deployed)
PLAYWRIGHT_BASE_URL=http://localhost:5173 yarn test:e2e
yarn test:e2e:ui   # Playwright UI mode for debugging
```

E2E tests create and clean up their own test users via the registration and account deletion APIs — no pre-existing test credentials needed.

## Building for Production

```sh
VITE_WS_URL=wss://your-ws-url yarn build   # outputs to dist/
yarn preview                                # preview the build locally
```
