/**
 * Shared test factories for frontend tests.
 * Use these instead of duplicating mock data across test files.
 */

import { configureStore } from "@reduxjs/toolkit";
import { api } from "@/services/api";
import authReducer from "@/features/auth/authSlice";
import uiReducer from "@/features/ui/uiSlice";
import type { Channel, Message, User } from "@/types";

// ── Entity factories ──────────────────────────────────────────────────────────

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    username: "alice",
    email: "alice@example.com",
    role: "user",
    displayName: null,
    bio: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: "channel-1",
    type: "ROOM",
    name: "General",
    description: null,
    ownerId: "user-1",
    unreadCount: 0,
    latestAt: null,
    lastMessageId: null,
    latestMessage: null,
    ...overrides,
  } as Channel;
}

export function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    channelId: "channel-1",
    content: "Hello world",
    type: "USER",
    author: { id: "user-2", username: "bob" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    editedAt: null,
    deletedAt: null,
    metadata: null,
    ...overrides,
  };
}

// ── Redux store factory ───────────────────────────────────────────────────────

export function makeStore(authUser?: Pick<User, "id" | "username">) {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      auth: authReducer,
      ui: uiReducer,
    },
    middleware: (m) => m().concat(api.middleware),
    preloadedState: authUser
      ? {
          auth: {
            user: makeUser({ id: authUser.id, username: authUser.username }),
            accessToken: "token",
            refreshToken: "refresh",
            isBootstrapping: false,
          },
        }
      : undefined,
  });
}
