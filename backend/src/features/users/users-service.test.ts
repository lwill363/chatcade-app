import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as UsersService from "./users-service";
import * as UsersRepository from "./users-repository";
import { ConflictError, NotFoundError } from "@common/errors";
import { IDS, mockPrisma, makeDbUser } from "@test/factories";

vi.mock("./users-repository");

const USER_ID = IDS.USER;

const mockDbUser = makeDbUser();

const mockFormattedUser = {
  id: USER_ID,
  username: "alice",
  email: "alice@example.com",
  role: "user",
  displayName: "Alice",
  bio: "Hello!",
  createdAt: mockDbUser.createdAt,
  updatedAt: mockDbUser.updatedAt,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getProfile", () => {
  it("returns the formatted user profile", async () => {
    vi.mocked(UsersRepository.findById).mockResolvedValue(mockDbUser);

    const result = await UsersService.getProfile(USER_ID, mockPrisma);

    expect(UsersRepository.findById).toHaveBeenCalledWith(mockPrisma, USER_ID);
    expect(result).toEqual(mockFormattedUser);
  });

  it("throws NotFoundError when user does not exist", async () => {
    vi.mocked(UsersRepository.findById).mockResolvedValue(null);

    await expect(UsersService.getProfile(USER_ID, mockPrisma)).rejects.toThrow(NotFoundError);
  });

  it("returns null displayName and bio when profile is absent", async () => {
    vi.mocked(UsersRepository.findById).mockResolvedValue({ ...mockDbUser, profile: null });

    const result = await UsersService.getProfile(USER_ID, mockPrisma);

    expect(result.displayName).toBeNull();
    expect(result.bio).toBeNull();
  });
});

describe("updateProfile", () => {
  it("updates the username when it changes", async () => {
    vi.mocked(UsersRepository.findByUsernameExcluding).mockResolvedValue(null);
    vi.mocked(UsersRepository.update).mockResolvedValue(mockDbUser);
    vi.mocked(UsersRepository.findById).mockResolvedValue(mockDbUser);

    await UsersService.updateProfile(USER_ID, { username: "newname" }, mockPrisma);

    expect(UsersRepository.update).toHaveBeenCalledWith(mockPrisma, USER_ID, { username: "newname" });
  });

  it("throws ConflictError when username is already taken", async () => {
    vi.mocked(UsersRepository.findByUsernameExcluding).mockResolvedValue({ id: "other-user" });

    await expect(
      UsersService.updateProfile(USER_ID, { username: "taken" }, mockPrisma)
    ).rejects.toThrow(ConflictError);
  });

  it("upserts profile when displayName or bio is provided", async () => {
    vi.mocked(UsersRepository.upsertProfile).mockResolvedValue(undefined as any);
    vi.mocked(UsersRepository.findById).mockResolvedValue(mockDbUser);

    await UsersService.updateProfile(USER_ID, { displayName: "Alice", bio: "Hi!" }, mockPrisma);

    expect(UsersRepository.upsertProfile).toHaveBeenCalledWith(mockPrisma, USER_ID, {
      displayName: "Alice",
      bio: "Hi!",
    });
  });

  it("does not upsert profile when no profile fields are provided", async () => {
    vi.mocked(UsersRepository.findByUsernameExcluding).mockResolvedValue(null);
    vi.mocked(UsersRepository.update).mockResolvedValue(mockDbUser);
    vi.mocked(UsersRepository.findById).mockResolvedValue(mockDbUser);

    await UsersService.updateProfile(USER_ID, { username: "newname" }, mockPrisma);

    expect(UsersRepository.upsertProfile).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when user is not found after update", async () => {
    vi.mocked(UsersRepository.findById).mockResolvedValue(null);

    await expect(
      UsersService.updateProfile(USER_ID, { bio: "Hi" }, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });
});

describe("getUserById", () => {
  it("returns public profile with display name and bio", async () => {
    vi.mocked(UsersRepository.findPublicById).mockResolvedValue({
      id: USER_ID,
      username: "alice",
      role: { name: "user" },
      profile: { displayName: "Alice", bio: "Hello!" },
      createdAt: mockDbUser.createdAt,
    });

    const result = await UsersService.getUserById(USER_ID, mockPrisma);

    expect(result.displayName).toBe("Alice");
    expect(result.bio).toBe("Hello!");
  });

  it("throws NotFoundError when user does not exist", async () => {
    vi.mocked(UsersRepository.findPublicById).mockResolvedValue(null);

    await expect(UsersService.getUserById(USER_ID, mockPrisma)).rejects.toThrow(NotFoundError);
  });
});

describe("searchUsers", () => {
  it("delegates to the repository", async () => {
    const results = [{ id: USER_ID, username: "alice", profile: null }];
    vi.mocked(UsersRepository.searchByUsername).mockResolvedValue(results);

    const result = await UsersService.searchUsers("ali", "other-user", mockPrisma);

    expect(UsersRepository.searchByUsername).toHaveBeenCalledWith(mockPrisma, "ali", "other-user");
    expect(result).toEqual(results);
  });
});

describe("deleteAccount", () => {
  it("transfers room ownership to the longest-standing member when others exist", async () => {
    const NEW_OWNER_ID = "user-2";
    const mockPrismaWithRooms = {
      channel: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "room-1",
            members: [{ userId: NEW_OWNER_ID }],
          },
        ]),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      user: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    await UsersService.deleteAccount(USER_ID, mockPrismaWithRooms);

    expect(mockPrismaWithRooms.channel.update).toHaveBeenCalledWith({
      where: { id: "room-1" },
      data: { ownerId: NEW_OWNER_ID },
    });
    expect(mockPrismaWithRooms.channel.delete).not.toHaveBeenCalled();
    expect(mockPrismaWithRooms.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });

  it("deletes the room when no other members exist", async () => {
    const mockPrismaWithEmptyRoom = {
      channel: {
        findMany: vi.fn().mockResolvedValue([
          { id: "room-1", members: [] },
        ]),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      user: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    await UsersService.deleteAccount(USER_ID, mockPrismaWithEmptyRoom);

    expect(mockPrismaWithEmptyRoom.channel.delete).toHaveBeenCalledWith({ where: { id: "room-1" } });
    expect(mockPrismaWithEmptyRoom.channel.update).not.toHaveBeenCalled();
    expect(mockPrismaWithEmptyRoom.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });

  it("deletes the user even when they own no rooms", async () => {
    const mockPrismaNoRooms = {
      channel: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    await UsersService.deleteAccount(USER_ID, mockPrismaNoRooms);

    expect(mockPrismaNoRooms.channel.update).not.toHaveBeenCalled();
    expect(mockPrismaNoRooms.channel.delete).not.toHaveBeenCalled();
    expect(mockPrismaNoRooms.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });
});

describe("getPresence", () => {
  const NOW = new Date("2024-06-01T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns isOnline=true when lastSeenAt is within 2 minutes", async () => {
    const lastSeenAt = new Date(NOW - 60_000); // 1 minute ago
    vi.mocked(UsersRepository.getPresence).mockResolvedValue([
      { id: USER_ID, lastSeenAt } as any,
    ]);

    const [result] = await UsersService.getPresence([USER_ID], mockPrisma);

    expect(result.isOnline).toBe(true);
    expect(result.isAway).toBe(false);
  });

  it("returns isAway=true when lastSeenAt is between 2 and 15 minutes ago", async () => {
    const lastSeenAt = new Date(NOW - 5 * 60_000); // 5 minutes ago
    vi.mocked(UsersRepository.getPresence).mockResolvedValue([
      { id: USER_ID, lastSeenAt } as any,
    ]);

    const [result] = await UsersService.getPresence([USER_ID], mockPrisma);

    expect(result.isOnline).toBe(false);
    expect(result.isAway).toBe(true);
  });

  it("returns offline when lastSeenAt is more than 15 minutes ago", async () => {
    const lastSeenAt = new Date(NOW - 20 * 60_000); // 20 minutes ago
    vi.mocked(UsersRepository.getPresence).mockResolvedValue([
      { id: USER_ID, lastSeenAt } as any,
    ]);

    const [result] = await UsersService.getPresence([USER_ID], mockPrisma);

    expect(result.isOnline).toBe(false);
    expect(result.isAway).toBe(false);
  });

  it("returns offline when lastSeenAt is null (user never seen)", async () => {
    vi.mocked(UsersRepository.getPresence).mockResolvedValue([
      { id: USER_ID, lastSeenAt: null } as any,
    ]);

    const [result] = await UsersService.getPresence([USER_ID], mockPrisma);

    expect(result.isOnline).toBe(false);
    expect(result.isAway).toBe(false);
  });

  it("returns correct userId in the result", async () => {
    vi.mocked(UsersRepository.getPresence).mockResolvedValue([
      { id: USER_ID, lastSeenAt: null } as any,
    ]);

    const [result] = await UsersService.getPresence([USER_ID], mockPrisma);

    expect(result.userId).toBe(USER_ID);
  });
});
