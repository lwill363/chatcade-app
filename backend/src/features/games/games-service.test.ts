import { describe, it, expect, vi, beforeEach } from "vitest";
import * as GamesService from "./games-service";
import * as GamesRepository from "./games-repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@common/errors";
import { IDS, makeMembership } from "@test/factories";

vi.mock("./games-repository");
vi.mock("@common/broadcast/broadcast-service", () => ({
  broadcastToChannel: vi.fn().mockResolvedValue(undefined),
  broadcastToUsers: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@features/games/games-config", () => ({
  gamesConfig: { WS_CALLBACK_URL: "http://test-callback" },
}));

const CHANNEL_ID = IDS.CHANNEL;
const GAME_ID = IDS.GAME;
const USER_ID = IDS.USER;
const OTHER_USER_ID = IDS.PARTNER;

const mockPlayer1 = { position: 1, user: { id: USER_ID, username: "alice" } };
const mockPlayer2 = { position: 2, user: { id: OTHER_USER_ID, username: "bob" } };

const mockGame = {
  id: GAME_ID,
  type: "TIC_TAC_TOE" as const,
  channelId: CHANNEL_ID,
  status: "ACTIVE" as const,
  state: { board: [null, null, null, null, null, null, null, null, null] },
  currentTurn: "1",
  vsBot: false,
  difficulty: "HARD" as const,
  winnerId: null,
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  updatedAt: new Date(),
  players: [mockPlayer1, mockPlayer2],
  winner: null,
};

const mockWaitingGame = { ...mockGame, status: "WAITING" as const, players: [mockPlayer1] };
const mockFinishedGame = { ...mockGame, status: "FINISHED" as const };
const mockSoloGame = { ...mockGame, channelId: null, vsBot: true };

const mockMembership = makeMembership();

// Prisma methods used directly by games-service (not through repository)
const mockPrisma = {
  channelMember: { findUnique: vi.fn() },
  message: { create: vi.fn().mockResolvedValue({ id: "msg-1" }) },
  channel: { update: vi.fn().mockResolvedValue(undefined) },
} as any;

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.message.create.mockResolvedValue({ id: "msg-1" });
  mockPrisma.channel.update.mockResolvedValue(undefined);
});

// ── Active channel games ───────────────────────────────────────────────────────

describe("getActiveChannelGames", () => {
  it("delegates to the repository", async () => {
    vi.mocked(GamesRepository.findActiveChannelGames).mockResolvedValue([mockGame]);

    const result = await GamesService.getActiveChannelGames(USER_ID, mockPrisma);

    expect(GamesRepository.findActiveChannelGames).toHaveBeenCalledWith(mockPrisma, USER_ID);
    expect(result).toEqual([mockGame]);
  });
});

// ── Solo game ─────────────────────────────────────────────────────────────────

describe("getActiveSoloGame", () => {
  it("delegates to the repository", async () => {
    vi.mocked(GamesRepository.findActiveSoloGame).mockResolvedValue(mockSoloGame);

    const result = await GamesService.getActiveSoloGame(USER_ID, mockPrisma);

    expect(GamesRepository.findActiveSoloGame).toHaveBeenCalledWith(mockPrisma, USER_ID);
    expect(result).toEqual(mockSoloGame);
  });
});

describe("createSoloGame", () => {
  it("forfeits any existing solo game before creating a new one", async () => {
    vi.mocked(GamesRepository.findActiveSoloGame).mockResolvedValue(mockSoloGame);
    vi.mocked(GamesRepository.forfeitGame).mockResolvedValue(mockFinishedGame);
    vi.mocked(GamesRepository.createSoloGame).mockResolvedValue(mockSoloGame);

    await GamesService.createSoloGame(USER_ID, { difficulty: "HARD" }, mockPrisma);

    expect(GamesRepository.forfeitGame).toHaveBeenCalledWith(mockPrisma, GAME_ID, null);
    expect(GamesRepository.createSoloGame).toHaveBeenCalled();
  });

  it("creates a solo game when none exists", async () => {
    vi.mocked(GamesRepository.findActiveSoloGame).mockResolvedValue(null);
    vi.mocked(GamesRepository.createSoloGame).mockResolvedValue(mockSoloGame);

    await GamesService.createSoloGame(USER_ID, { difficulty: "EASY" }, mockPrisma);

    expect(GamesRepository.forfeitGame).not.toHaveBeenCalled();
    expect(GamesRepository.createSoloGame).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
      difficulty: "EASY",
      player1Id: USER_ID,
    }));
  });
});

// ── Channel game ──────────────────────────────────────────────────────────────

describe("getActiveGame", () => {
  it("throws ForbiddenError when user is not a channel member", async () => {
    mockPrisma.channelMember.findUnique.mockResolvedValue(null);

    await expect(
      GamesService.getActiveGame(CHANNEL_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("returns the active game for a channel member", async () => {
    mockPrisma.channelMember.findUnique.mockResolvedValue(mockMembership);
    vi.mocked(GamesRepository.findActiveGame).mockResolvedValue(mockGame);

    const result = await GamesService.getActiveGame(CHANNEL_ID, USER_ID, mockPrisma);

    expect(result).toEqual(mockGame);
  });

  it("forfeits and returns recent finished game when active game is expired", async () => {
    const expiredGame = { ...mockGame, expiresAt: new Date(Date.now() - 1000) };
    mockPrisma.channelMember.findUnique.mockResolvedValue(mockMembership);
    vi.mocked(GamesRepository.findActiveGame).mockResolvedValue(expiredGame);
    vi.mocked(GamesRepository.forfeitGame).mockResolvedValue(mockFinishedGame);
    vi.mocked(GamesRepository.findRecentFinishedGame).mockResolvedValue(mockFinishedGame);

    const result = await GamesService.getActiveGame(CHANNEL_ID, USER_ID, mockPrisma);

    expect(GamesRepository.forfeitGame).toHaveBeenCalledWith(mockPrisma, GAME_ID, null);
    expect(result).toEqual(mockFinishedGame);
  });

  it("falls back to recent finished game when no active game exists", async () => {
    mockPrisma.channelMember.findUnique.mockResolvedValue(mockMembership);
    vi.mocked(GamesRepository.findActiveGame).mockResolvedValue(null);
    vi.mocked(GamesRepository.findRecentFinishedGame).mockResolvedValue(mockFinishedGame);

    const result = await GamesService.getActiveGame(CHANNEL_ID, USER_ID, mockPrisma);

    expect(result).toEqual(mockFinishedGame);
  });
});

describe("createGame", () => {
  it("throws ForbiddenError when user is not a channel member", async () => {
    mockPrisma.channelMember.findUnique.mockResolvedValue(null);

    await expect(
      GamesService.createGame(CHANNEL_ID, USER_ID, { vsBot: false, difficulty: "HARD" }, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ConflictError when a game is already in progress", async () => {
    mockPrisma.channelMember.findUnique.mockResolvedValue(mockMembership);
    vi.mocked(GamesRepository.findActiveGame).mockResolvedValue(mockGame);

    await expect(
      GamesService.createGame(CHANNEL_ID, USER_ID, { vsBot: false, difficulty: "HARD" }, mockPrisma)
    ).rejects.toThrow(ConflictError);
  });

  it("creates and returns a game when the channel is free", async () => {
    mockPrisma.channelMember.findUnique.mockResolvedValue(mockMembership);
    vi.mocked(GamesRepository.findActiveGame).mockResolvedValue(null);
    vi.mocked(GamesRepository.createGame).mockResolvedValue(mockWaitingGame);

    const result = await GamesService.createGame(
      CHANNEL_ID, USER_ID, { vsBot: false, difficulty: "HARD" }, mockPrisma
    );

    expect(GamesRepository.createGame).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
      channelId: CHANNEL_ID,
      player1Id: USER_ID,
      vsBot: false,
    }));
    expect(result).toEqual(mockWaitingGame);
  });
});

describe("joinGame", () => {
  it("throws NotFoundError when game does not exist", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(null);

    await expect(
      GamesService.joinGame(GAME_ID, OTHER_USER_ID, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when game is not in WAITING status", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(mockGame); // ACTIVE

    await expect(
      GamesService.joinGame(GAME_ID, OTHER_USER_ID, mockPrisma)
    ).rejects.toThrow(ConflictError);
  });

  it("throws ForbiddenError when user tries to join their own game", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(mockWaitingGame);

    await expect(
      GamesService.joinGame(GAME_ID, USER_ID, mockPrisma) // USER_ID is already player 1
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when trying to join a bot game", async () => {
    const botGame = { ...mockWaitingGame, vsBot: true };
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(botGame);

    await expect(
      GamesService.joinGame(GAME_ID, OTHER_USER_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("joins the game as player 2", async () => {
    mockPrisma.channelMember.findUnique.mockResolvedValue(mockMembership);
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(mockWaitingGame);
    vi.mocked(GamesRepository.joinGame).mockResolvedValue(mockGame);

    const result = await GamesService.joinGame(GAME_ID, OTHER_USER_ID, mockPrisma);

    expect(GamesRepository.joinGame).toHaveBeenCalledWith(mockPrisma, GAME_ID, OTHER_USER_ID, 2);
    expect(result).toEqual(mockGame);
  });
});

describe("forfeitGame", () => {
  it("throws NotFoundError when game does not exist", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(null);

    await expect(
      GamesService.forfeitGame(GAME_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when game is already finished", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(mockFinishedGame);

    await expect(
      GamesService.forfeitGame(GAME_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(ConflictError);
  });

  it("throws ForbiddenError when user is not a player", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(mockGame);

    await expect(
      GamesService.forfeitGame(GAME_ID, "not-a-player", mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("awards the win to the other player on forfeit", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(mockGame);
    vi.mocked(GamesRepository.forfeitGame).mockResolvedValue(mockFinishedGame);

    await GamesService.forfeitGame(GAME_ID, USER_ID, mockPrisma);

    expect(GamesRepository.forfeitGame).toHaveBeenCalledWith(mockPrisma, GAME_ID, OTHER_USER_ID);
  });
});

describe("makeMove", () => {
  it("throws NotFoundError when game does not exist", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(null);

    await expect(
      GamesService.makeMove(GAME_ID, USER_ID, { cellIndex: 0 }, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when game is not active", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(mockWaitingGame);

    await expect(
      GamesService.makeMove(GAME_ID, USER_ID, { cellIndex: 0 }, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("applies the move and persists the new state", async () => {
    vi.mocked(GamesRepository.findGameById).mockResolvedValue(mockGame);
    vi.mocked(GamesRepository.updateGameState).mockResolvedValue(mockGame);

    await GamesService.makeMove(GAME_ID, USER_ID, { cellIndex: 0 }, mockPrisma);

    expect(GamesRepository.updateGameState).toHaveBeenCalled();
  });
});
