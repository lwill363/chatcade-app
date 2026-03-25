import { PrismaClient, GameDifficulty, GameType } from "generated/prisma/client";
import * as GamesRepository from "@features/games/games-repository";
import * as TicTacToe from "@features/games/engines/tictactoe";
import { APIError, ConflictError, ForbiddenError, NotFoundError } from "@common/errors";
import { CreateGameDTO, CreateSoloGameDTO } from "@features/games/games-types";
import { broadcastToChannel } from "@common/broadcast/broadcast-service";
import { gamesConfig } from "@features/games/games-config";

type Game = Awaited<ReturnType<typeof GamesRepository.findGameById>>;

// ── Engine dispatch ────────────────────────────────────────────────────────────

const MAX_PLAYERS: Record<GameType, number> = {
  TIC_TAC_TOE: TicTacToe.MAX_PLAYERS,
};

function getInitialState(type: GameType): object {
  switch (type) {
    case "TIC_TAC_TOE": return TicTacToe.initialState();
  }
}

function applyMove(game: NonNullable<Game>, userId: string, move: unknown) {
  switch (game.type) {
    case "TIC_TAC_TOE": {
      const state = TicTacToe.StateSchema.safeParse(game.state);
      if (!state.success) {
        console.error(`[games] corrupted state for game ${game.id}:`, state.error);
        throw new ConflictError("Game state is corrupted");
      }
      return TicTacToe.applyMove(
        state.data,
        game.currentTurn,
        game.players,
        userId,
        move,
        game.vsBot,
        game.difficulty
      );
    }
    default:
      console.error(`[games] unsupported game type: ${(game as { type: string }).type}`);
      throw new APIError({ name: "INTERNAL_SERVER_ERROR", message: "Unsupported game type", code: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function postGameResult(
  prisma: PrismaClient,
  channelId: string,
  authorId: string,
  gameId: string,
  gameName: string,
  winnerLabel: string | null // null = draw
) {
  const content = winnerLabel
    ? `${winnerLabel} won ${gameName}`
    : `${gameName} ended in a draw`;

  const msg = await prisma.message.create({
    data: {
      type: "GAME_RESULT",
      content,
      channelId,
      authorId,
      metadata: { gameId, gameName, winnerLabel },
    },
    select: { id: true },
  });
  await prisma.channel.update({
    where: { id: channelId },
    data: { lastMessageId: msg.id },
  });
}


async function assertChannelMember(prisma: PrismaClient, channelId: string, userId: string) {
  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { channelId: true },
  });
  if (!member) throw new ForbiddenError("You are not a member of this channel");
}

// ── Channel game functions ─────────────────────────────────────────────────────

export async function getActiveGame(channelId: string, userId: string, prisma: PrismaClient) {
  await assertChannelMember(prisma, channelId, userId);
  const game = await GamesRepository.findActiveGame(prisma, channelId);
  if (game?.expiresAt && game.expiresAt < new Date()) {
    await GamesRepository.forfeitGame(prisma, game.id, null);
    return GamesRepository.findRecentFinishedGame(prisma, channelId, userId);
  }
  if (game) return game;
  return GamesRepository.findRecentFinishedGame(prisma, channelId, userId);
}

export async function createGame(
  channelId: string,
  userId: string,
  data: CreateGameDTO,
  prisma: PrismaClient
) {
  await assertChannelMember(prisma, channelId, userId);
  const existing = await GamesRepository.findActiveGame(prisma, channelId);
  if (existing) throw new ConflictError("A game is already in progress in this channel");

  const type: GameType = "TIC_TAC_TOE";
  const game = await GamesRepository.createGame(prisma, {
    type,
    channelId,
    player1Id: userId,
    vsBot: data.vsBot,
    difficulty: data.difficulty as GameDifficulty,
    initialState: getInitialState(type),
  });

  const inviteMessage = await prisma.message.create({
    data: {
      type: "GAME_INVITE",
      content: "wants to play Tic-Tac-Toe",
      channelId,
      authorId: userId,
      metadata: { gameId: game.id, gameName: "Tic-Tac-Toe" },
    },
    select: { id: true },
  });
  await prisma.channel.update({
    where: { id: channelId },
    data: { lastMessageId: inviteMessage.id },
  });

  void broadcastToChannel(prisma, gamesConfig.WS_CALLBACK_URL, channelId, {
    type: "game.updated", channelId, gameId: game.id,
  });

  return game;
}

export async function joinGame(gameId: string, userId: string, prisma: PrismaClient) {
  const game = await GamesRepository.findGameById(prisma, gameId);
  if (!game) throw new NotFoundError("Game");
  if (game.status !== "WAITING") throw new ConflictError("This game is no longer waiting for a player");
  if (game.players.some((p) => p.user.id === userId)) throw new ForbiddenError("You cannot join your own game");
  if (game.vsBot) throw new ForbiddenError("Cannot join a bot game");
  if (game.channelId) await assertChannelMember(prisma, game.channelId, userId);

  const maxPlayers = MAX_PLAYERS[game.type];
  if (game.players.length >= maxPlayers) throw new ConflictError("This game is full");

  const nextPosition = game.players.length + 1;
  const updated = await GamesRepository.joinGame(prisma, gameId, userId, nextPosition);

  if (game.channelId) {
    void broadcastToChannel(prisma, gamesConfig.WS_CALLBACK_URL, game.channelId, {
      type: "game.updated", channelId: game.channelId, gameId,
    });
  }

  return updated;
}

export async function makeMove(
  gameId: string,
  userId: string,
  move: unknown,
  prisma: PrismaClient
) {
  const game = await GamesRepository.findGameById(prisma, gameId);
  if (!game) throw new NotFoundError("Game");
  if (game.status !== "ACTIVE") throw new ForbiddenError("Game is not active");

  const result = applyMove(game, userId, move);
  const status = result.finished ? "FINISHED" : "ACTIVE";

  const updated = await GamesRepository.updateGameState(
    prisma,
    gameId,
    result.state,
    result.currentTurn,
    status,
    result.winnerId
  );

  if (result.finished && game.channelId) {
    await postGameResult(prisma, game.channelId, userId, gameId, "Tic-Tac-Toe", result.winnerLabel);
  }

  if (game.channelId) {
    void broadcastToChannel(prisma, gamesConfig.WS_CALLBACK_URL, game.channelId, {
      type: "game.updated", channelId: game.channelId, gameId,
    });
  }

  return updated;
}

export async function forfeitGame(gameId: string, userId: string, prisma: PrismaClient) {
  const game = await GamesRepository.findGameById(prisma, gameId);
  if (!game) throw new NotFoundError("Game");
  if (game.status === "FINISHED") throw new ConflictError("Game is already finished");

  const forfeitingPlayer = game.players.find((p) => p.user.id === userId);
  if (!forfeitingPlayer) throw new ForbiddenError("You are not a player in this game");

  // Award the win to the other player if there are exactly two players
  const otherPlayer = game.players.find((p) => p.user.id !== userId);
  const winnerId = otherPlayer?.user.id ?? null;

  const updated = await GamesRepository.forfeitGame(prisma, gameId, winnerId);

  if (game.channelId) {
    const cancelled = game.players.length < 2;
    if (cancelled) {
      // No opponent ever joined — post "cancelled" instead of a result
      await prisma.message.create({
        data: {
          type: "GAME_RESULT",
          content: "Tic-Tac-Toe was cancelled",
          channelId: game.channelId,
          authorId: userId,
          metadata: { gameId, gameName: "Tic-Tac-Toe", winnerLabel: null, cancelled: true },
        },
        select: { id: true },
      }).then((msg) =>
        prisma.channel.update({ where: { id: game.channelId! }, data: { lastMessageId: msg.id } })
      );
    } else {
      await postGameResult(
        prisma, game.channelId, userId, gameId, "Tic-Tac-Toe",
        otherPlayer?.user.username ?? null
      );
    }
  }

  if (game.channelId) {
    void broadcastToChannel(prisma, gamesConfig.WS_CALLBACK_URL, game.channelId, {
      type: "game.updated", channelId: game.channelId, gameId,
    });
  }

  return updated;
}

// ── Solo game functions ────────────────────────────────────────────────────────

export async function getActiveChannelGames(userId: string, prisma: PrismaClient) {
  return GamesRepository.findActiveChannelGames(prisma, userId);
}

export async function getActiveSoloGame(userId: string, prisma: PrismaClient) {
  return GamesRepository.findActiveSoloGame(prisma, userId);
}

export async function createSoloGame(
  userId: string,
  data: CreateSoloGameDTO,
  prisma: PrismaClient
) {
  const existing = await GamesRepository.findActiveSoloGame(prisma, userId);
  if (existing) {
    await GamesRepository.forfeitGame(prisma, existing.id, null);
  }
  const type: GameType = "TIC_TAC_TOE";
  return GamesRepository.createSoloGame(prisma, {
    type,
    player1Id: userId,
    difficulty: data.difficulty as GameDifficulty,
    initialState: getInitialState(type),
  });
}
