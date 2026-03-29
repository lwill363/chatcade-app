/**
 * Shared test factories for backend service tests.
 * Use these instead of duplicating mock data across test files.
 */

// ── Stable IDs ────────────────────────────────────────────────────────────────

export const IDS = {
  USER: "user-1",
  PARTNER: "user-2",
  OTHER: "user-3",
  CHANNEL: "channel-1",
  MESSAGE: "msg-1",
  INVITE: "invite-1",
  GAME: "game-1",
} as const;

// ── Prisma client stub ────────────────────────────────────────────────────────

// Most service tests mock at the repository layer and never call prisma directly.
// Pass this as the prisma argument for those tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockPrisma = {} as any;

// ── Entity factories ──────────────────────────────────────────────────────────

export function makeRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: IDS.CHANNEL,
    type: "ROOM" as const,
    name: "General",
    description: null,
    ownerId: IDS.USER,
    createdAt: new Date(),
    _count: { members: 1 },
    ...overrides,
  };
}

export function makeDirectChannel(overrides: Record<string, unknown> = {}) {
  return {
    id: IDS.CHANNEL,
    type: "DM" as const,
    ...overrides,
  };
}

export function makeMembership(overrides: Record<string, unknown> = {}) {
  return {
    channelId: IDS.CHANNEL,
    ...overrides,
  };
}

export function makeDbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: IDS.USER,
    username: "alice",
    emailAddress: "alice@example.com",
    role: { name: "user" },
    profile: { displayName: "Alice", bio: "Hello!" },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: IDS.MESSAGE,
    channelId: IDS.CHANNEL,
    authorId: IDS.USER,
    content: "Hello",
    type: "USER" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    editedAt: null,
    deletedAt: null,
    author: { id: IDS.USER, username: "alice" },
    ...overrides,
  };
}

export function makeInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: IDS.INVITE,
    channelId: IDS.CHANNEL,
    inviteeId: IDS.USER,
    status: "PENDING" as const,
    channel: { type: "ROOM" as const },
    ...overrides,
  };
}
