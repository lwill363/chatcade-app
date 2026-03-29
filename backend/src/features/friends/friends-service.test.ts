import { describe, it, expect, vi, beforeEach } from "vitest";
import * as FriendsService from "./friends-service";
import * as FriendsRepository from "./friends-repository";
import { ForbiddenError, NotFoundError } from "@common/errors";
import { IDS, mockPrisma } from "@test/factories";

vi.mock("./friends-repository");
vi.mock("@features/friends/friends-config", () => ({
  friendsConfig: { WS_CALLBACK_URL: "http://test-callback" },
}));
vi.mock("@common/broadcast/broadcast-service", () => ({
  broadcastToUsers: vi.fn().mockResolvedValue(undefined),
  broadcastToChannel: vi.fn().mockResolvedValue(undefined),
}));

const REQUESTER_ID = IDS.USER;
const ADDRESSEE_ID = IDS.PARTNER;

const mockFriend = {
  friendshipId: "friendship-1",
  userId: ADDRESSEE_ID,
  username: "bob",
  displayName: null,
};

const mockRequest = {
  friendshipId: "friendship-1",
  userId: REQUESTER_ID,
  username: "alice",
  displayName: null,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("sendFriendRequest", () => {
  it("delegates to the repository when requester and addressee differ", async () => {
    vi.mocked(FriendsRepository.sendFriendRequest).mockResolvedValue(mockFriend);

    await FriendsService.sendFriendRequest(REQUESTER_ID, ADDRESSEE_ID, mockPrisma);

    expect(FriendsRepository.sendFriendRequest).toHaveBeenCalledWith(
      mockPrisma,
      REQUESTER_ID,
      ADDRESSEE_ID
    );
  });

  it("throws ForbiddenError when requester sends request to themselves", async () => {
    await expect(
      FriendsService.sendFriendRequest(REQUESTER_ID, REQUESTER_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);

    expect(FriendsRepository.sendFriendRequest).not.toHaveBeenCalled();
  });
});

describe("listFriends", () => {
  it("delegates to the repository", async () => {
    vi.mocked(FriendsRepository.listFriends).mockResolvedValue([mockFriend]);

    const result = await FriendsService.listFriends(REQUESTER_ID, mockPrisma);

    expect(FriendsRepository.listFriends).toHaveBeenCalledWith(mockPrisma, REQUESTER_ID);
    expect(result).toEqual([mockFriend]);
  });
});

describe("listIncomingRequests", () => {
  it("delegates to the repository", async () => {
    vi.mocked(FriendsRepository.listIncomingRequests).mockResolvedValue([mockRequest]);

    const result = await FriendsService.listIncomingRequests(ADDRESSEE_ID, mockPrisma);

    expect(FriendsRepository.listIncomingRequests).toHaveBeenCalledWith(mockPrisma, ADDRESSEE_ID);
    expect(result).toEqual([mockRequest]);
  });
});

describe("listOutgoingRequests", () => {
  it("delegates to the repository", async () => {
    vi.mocked(FriendsRepository.listOutgoingRequests).mockResolvedValue([mockRequest]);

    const result = await FriendsService.listOutgoingRequests(REQUESTER_ID, mockPrisma);

    expect(FriendsRepository.listOutgoingRequests).toHaveBeenCalledWith(mockPrisma, REQUESTER_ID);
    expect(result).toEqual([mockRequest]);
  });
});

describe("respondToRequest", () => {
  it("accepts a friend request", async () => {
    vi.mocked(FriendsRepository.respondToRequest).mockResolvedValue(mockFriend);

    await FriendsService.respondToRequest(ADDRESSEE_ID, REQUESTER_ID, "accept", mockPrisma);

    expect(FriendsRepository.respondToRequest).toHaveBeenCalledWith(
      mockPrisma,
      REQUESTER_ID,
      ADDRESSEE_ID,
      "accept"
    );
  });

  it("throws NotFoundError when accepting a non-existent request", async () => {
    vi.mocked(FriendsRepository.respondToRequest).mockResolvedValue(null);

    await expect(
      FriendsService.respondToRequest(ADDRESSEE_ID, REQUESTER_ID, "accept", mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("does not throw when declining a non-existent request", async () => {
    vi.mocked(FriendsRepository.respondToRequest).mockResolvedValue(null);

    await expect(
      FriendsService.respondToRequest(ADDRESSEE_ID, REQUESTER_ID, "decline", mockPrisma)
    ).resolves.toBeNull();
  });
});

describe("removeFriend", () => {
  it("delegates to the repository", async () => {
    vi.mocked(FriendsRepository.removeFriend).mockResolvedValue(undefined);

    await FriendsService.removeFriend(REQUESTER_ID, ADDRESSEE_ID, mockPrisma);

    expect(FriendsRepository.removeFriend).toHaveBeenCalledWith(
      mockPrisma,
      REQUESTER_ID,
      ADDRESSEE_ID
    );
  });
});
