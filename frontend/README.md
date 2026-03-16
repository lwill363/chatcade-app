# Chatcade — Frontend

Discord-like chat UI built with React 19, Redux Toolkit, and Tailwind CSS v4.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build tool:** Vite 6
- **State management:** Redux Toolkit 2 with RTK Query (API caching + mutations)
- **Routing:** React Router 7
- **Forms:** React Hook Form + Zod validation
- **Styling:** Tailwind CSS v4 (CSS-based config via `@tailwindcss/vite`)
- **Utilities:** date-fns, clsx, tailwind-merge
- **Package manager:** Yarn 4

## Project Structure

```
frontend/
├── index.html
├── vite.config.ts          # Vite proxy + path aliases
└── src/
    ├── main.tsx            # App entry — session restore on load
    ├── App.tsx
    ├── index.css           # Tailwind import + base styles
    ├── lib/utils.ts        # cn() helper (clsx + twMerge)
    ├── types/index.ts      # Shared TypeScript interfaces
    ├── app/
    │   ├── store.ts        # Redux store
    │   └── hooks.ts        # Typed useAppDispatch / useAppSelector
    ├── services/
    │   └── api.ts          # RTK Query base — auto token refresh on 401
    ├── features/
    │   ├── auth/           # authSlice + authApi (RTK Query endpoints)
    │   ├── servers/        # serversApi
    │   ├── channels/       # channelsApi
    │   ├── messages/       # messagesApi
    │   ├── users/          # usersApi
    │   └── ui/             # uiSlice (selected server/channel)
    ├── components/
    │   ├── ui/             # Button, Input, Modal, Spinner, Avatar
    │   ├── layout/         # AppLayout, ServerSidebar, ChannelSidebar, MembersSidebar
    │   ├── chat/           # ChatArea, MessageList, MessageItem, MessageInput
    │   └── modals/         # CreateServerModal, CreateChannelModal, UserSettingsModal
    ├── pages/
    │   ├── LoginPage.tsx
    │   └── RegisterPage.tsx
    └── router/
        ├── index.tsx       # Route definitions
        └── ProtectedRoute.tsx
```

## Setup

**Prerequisites:** Node.js 22, Yarn 4 (`corepack enable`)

```sh
yarn install
cp .env.example .env
yarn dev
```

The dev server starts at **http://localhost:5173**.

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API base URL for production builds. Leave empty in local dev — Vite proxy handles routing. |

## Local Development

In local dev, the Vite dev server proxies API requests to the backend services running on separate ports:

| Prefix | Backend service | Port |
|---|---|---|
| `/auth` | auth | 3001 |
| `/servers` | servers | 3002 |
| `/channels` | channels | 3003 |
| `/messages` | messages | 3004 |
| `/users` | users | 3005 |

Start each backend service before running the frontend — see the [backend README](../backend/README.md).

## Auth Flow

1. On login/register, the `accessToken` is stored in Redux (in-memory) and the `refreshToken` is persisted to `localStorage`.
2. On page load, `main.tsx` checks `localStorage` for a refresh token and automatically exchanges it for a new access token, restoring the session.
3. RTK Query's base query adds `Authorization: Bearer <accessToken>` to every request.
4. On a `401` response, the base query transparently refreshes the token and retries the original request. If refresh fails, the user is logged out.

## UI Layout

```
┌──────┬────────────┬──────────────────────────┬──────────┐
│Server│  Channels  │       Message History     │ Members  │
│ List │  (72px +   │                           │  List    │
│(72px)│   240px)   │                           │ (240px)  │
│      │            ├──────────────────────────┤          │
│      │  User bar  │      Message Input        │          │
└──────┴────────────┴──────────────────────────┴──────────┘
```

- **Server sidebar** — icon per server, add server button
- **Channel sidebar** — channel list, create channel (server owner), user info + settings
- **Chat area** — infinite scroll upward, inline message edit/delete, member list toggle
- **Members sidebar** — toggleable, shows all server members

## Key Design Decisions

- **Single RTK Query API instance** — all feature endpoints are injected into one `createApi` so they share the same tag-based cache.
- **Message pagination** — cursor-based (`before` UUID). `MessageList` accumulates pages in local state when scrolling up, and auto-scrolls to the bottom on new messages.
- **Message grouping** — consecutive messages from the same author within 5 minutes are visually grouped (avatar shown only on the first).
- **Path alias** — `@/` maps to `src/` in both TypeScript and Vite.

## Building for Production

```sh
yarn build       # outputs to dist/
yarn preview     # preview the production build locally
```

Set `VITE_API_BASE_URL` in your deployment environment to your API Gateway URL.
