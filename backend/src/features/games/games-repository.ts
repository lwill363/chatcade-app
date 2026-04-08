import { PrismaClient, GameStatus, GameDifficulty, GameType } from "generated/prisma/client";

const PLAYER_SELECT = {
  position: true,
  user: { select: { id: true, username: true } },
} as const;

const GAME_SELECT = {
  id: true,
  type: true,
  channelId: true,
  status: true,
  state: true,
  currentTurn: true,
  vsBot: true,
  difficulty: true,
  winnerId: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  players: { select: PLAYER_SELECT, orderBy: { position: "asc" as const } },
  winner: { select: { id: true, username: true } },
} as const;

const WAITING_TIMEOUT_MS = 10 * 60 * 1000;
const ACTIVE_TIMEOUT_MS  = 30 * 60 * 1000;

export function findActiveGame(prisma: PrismaClient, channelId: string) {
  return prisma.game.findFirst({
    where: { channelId, status: { in: ["WAITING", "ACTIVE"] } },
    select: GAME_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export function findRecentFinishedGame(prisma: PrismaClient, channelId: string, userId: string) {
  return prisma.game.findFirst({
    where: {
      channelId,
      status: "FINISHED",
      players: { some: { userId } },
    },
    select: GAME_SELECT,
    orderBy: { updatedAt: "desc" },
  });
}

export function findActiveChannelGames(prisma: PrismaClient, userId: string) {
  return prisma.game.findMany({
    where: {
      channelId: { not: null },
      status: { in: ["WAITING", "ACTIVE"] },
      channel: { members: { some: { userId } } },
    },
    select: GAME_SELECT,
    orderBy: { updatedAt: "desc" },
  });
}

export function findActiveSoloGame(prisma: PrismaClient, userId: string) {
  return prisma.game.findFirst({
    where: {
      channelId: null,
      vsBot: true,
      status: { in: ["WAITING", "ACTIVE"] },
      players: { some: { userId } },
    },
    select: GAME_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export function findRecentFinishedSoloGame(prisma: PrismaClient, userId: string) {
  return prisma.game.findFirst({
    where: {
      channelId: null,
      vsBot: true,
      status: "FINISHED",
      players: { some: { userId } },
    },
    select: GAME_SELECT,
    orderBy: { updatedAt: "desc" },
  });
}

export function findGameById(prisma: PrismaClient, gameId: string) {
  return prisma.game.findUnique({
    where: { id: gameId },
    select: { ...GAME_SELECT, channelId: true },
  });
}

export function createGame(
  prisma: PrismaClient,
  data: {
    type: GameType;
    channelId: string;
    player1Id: string;
    vsBot: boolean;
    difficulty: GameDifficulty;
    initialState: object;
  }
) {
  const timeoutMs = data.vsBot ? ACTIVE_TIMEOUT_MS : WAITING_TIMEOUT_MS;
  return prisma.game.create({
    data: {
      type: data.type,
      channelId: data.channelId,
      vsBot: data.vsBot,
      difficulty: data.difficulty,
      status: data.vsBot ? "ACTIVE" : "WAITING",
      state: data.initialState as import("generated/prisma/client").Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + timeoutMs),
      players: { create: { userId: data.player1Id, position: 1 } },
    },
    select: GAME_SELECT,
  });
}

export function createSoloGame(
  prisma: PrismaClient,
  data: { type: GameType; player1Id: string; difficulty: GameDifficulty; initialState: object }
) {
  return prisma.game.create({
    data: {
      type: data.type,
      vsBot: true,
      difficulty: data.difficulty,
      status: "ACTIVE",
      state: data.initialState as import("generated/prisma/client").Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + ACTIVE_TIMEOUT_MS),
      players: { create: { userId: data.player1Id, position: 1 } },
    },
    select: GAME_SELECT,
  });
}

export function joinGame(
  prisma: PrismaClient,
  gameId: string,
  userId: string,
  position: number
) {
  return prisma.game.update({
    where: { id: gameId },
    data: {
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + ACTIVE_TIMEOUT_MS),
      players: { create: { userId, position } },
    },
    select: GAME_SELECT,
  });
}

export function updateGameState(
  prisma: PrismaClient,
  gameId: string,
  state: object,
  currentTurn: string,
  status: GameStatus,
  winnerId?: string | null
) {
  return prisma.game.update({
    where: { id: gameId },
    data: {
      state: state as import("generated/prisma/client").Prisma.InputJsonValue,
      currentTurn,
      status,
      winnerId: winnerId ?? null,
      expiresAt: status === "ACTIVE" ? new Date(Date.now() + ACTIVE_TIMEOUT_MS) : null,
    },
    select: GAME_SELECT,
  });
}

export function forfeitGame(prisma: PrismaClient, gameId: string, winnerId: string | null) {
  return prisma.game.update({
    where: { id: gameId },
    data: { status: "FINISHED", winnerId, expiresAt: null },
    select: GAME_SELECT,
  });
}
