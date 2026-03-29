import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ChannelsService from "./channels-service";
import * as ChannelsRepository from "./channels-repository";
import * as MembershipRepository from "@common/membership/membership-repository";
import * as ReadTrackingRepository from "@common/read-tracking/read-tracking-repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@common/errors";
import { IDS, mockPrisma, makeRoom, makeDirectChannel, makeMembership } from "@test/factories";

vi.mock("./channels-repository");
vi.mock("@common/membership/membership-repository");
vi.mock("@common/read-tracking/read-tracking-repository");
vi.mock("@common/messaging/messaging-repository");
vi.mock("@features/channels/channels-config", () => ({
  channelsConfig: { WS_CALLBACK_URL: "http://test-callback" },
}));
vi.mock("@common/broadcast/broadcast-service", () => ({
  broadcastToUsers: vi.fn().mockResolvedValue(undefined),
  broadcastToChannel: vi.fn().mockResolvedValue(undefined),
}));

const CHANNEL_ID = IDS.CHANNEL;
const USER_ID = IDS.USER;
const PARTNER_ID = IDS.PARTNER;
const MESSAGE_ID = IDS.MESSAGE;

const mockRoom = makeRoom();
const mockDirectChannel = makeDirectChannel();
const mockMembership = makeMembership();

beforeEach(() => {
  vi.resetAllMocks();
});

// Helper to build the membership shape returned by listChannelsForUser
function makeMembershipRow({
  channelId = IDS.CHANNEL,
  type = "ROOM" as "ROOM" | "DM",
  name = "General",
  ownerId = IDS.USER,
  lastMessage = null as null | { content: string; author: { username: string } | null; createdAt: Date },
  dmPartner = null as null | { id: string; username: string },
  lastReadAt = null as null | Date,
  unreadCount = 0,
} = {}) {
  vi.mocked(ReadTrackingRepository.countUnreadMessages).mockResolvedValue(unreadCount);
  return {
    channel: {
      id: channelId,
      type,
      name: type === "ROOM" ? name : null,
      description: null,
      ownerId: type === "ROOM" ? ownerId : null,
      lastMessageId: lastMessage ? "msg-1" : null,
      lastMessage,
      members: dmPartner ? [{ user: dmPartner }] : [],
    },
    lastReadMessage: lastReadAt ? { createdAt: lastReadAt } : null,
  };
}

describe("listChannels", () => {
  it("returns an empty array when the user has no channels", async () => {
    vi.mocked(ChannelsRepository.listChannelsForUser).mockResolvedValue([]);

    const result = await ChannelsService.listChannels(USER_ID, mockPrisma);
    expect(result).toEqual([]);
  });

  it("maps a ROOM membership to the correct shape", async () => {
    const row = makeMembershipRow({ type: "ROOM", name: "General", ownerId: USER_ID, unreadCount: 3 });
    vi.mocked(ChannelsRepository.listChannelsForUser).mockResolvedValue([row as any]);

    const [ch] = await ChannelsService.listChannels(USER_ID, mockPrisma);

    expect(ch.type).toBe("ROOM");
    expect((ch as any).name).toBe("General");
    expect((ch as any).ownerId).toBe(USER_ID);
    expect(ch.unreadCount).toBe(3);
  });

  it("maps a DM membership to the correct shape", async () => {
    const row = makeMembershipRow({
      type: "DM",
      dmPartner: { id: PARTNER_ID, username: "bob" },
    });
    vi.mocked(ChannelsRepository.listChannelsForUser).mockResolvedValue([row as any]);

    const [ch] = await ChannelsService.listChannels(USER_ID, mockPrisma);

    expect(ch.type).toBe("DM");
    expect((ch as any).partnerId).toBe(PARTNER_ID);
    expect((ch as any).partnerUsername).toBe("bob");
  });

  it("sorts channels by latestAt descending", async () => {
    const older = makeMembershipRow({
      channelId: "channel-old",
      type: "ROOM",
      name: "Old",
      lastMessage: { content: "hi", author: { username: "alice" }, createdAt: new Date("2024-01-01") },
    });
    const newer = makeMembershipRow({
      channelId: "channel-new",
      type: "ROOM",
      name: "New",
      lastMessage: { content: "hey", author: { username: "alice" }, createdAt: new Date("2024-06-01") },
    });
    vi.mocked(ChannelsRepository.listChannelsForUser).mockResolvedValue([older, newer] as any);

    const result = await ChannelsService.listChannels(USER_ID, mockPrisma);

    expect(result[0].id).toBe("channel-new");
    expect(result[1].id).toBe("channel-old");
  });

  it("pushes channels with no messages to the end", async () => {
    const withMessage = makeMembershipRow({
      channelId: "channel-with",
      type: "ROOM",
      name: "With",
      lastMessage: { content: "hi", author: { username: "alice" }, createdAt: new Date() },
    });
    const withoutMessage = makeMembershipRow({ channelId: "channel-without", type: "ROOM", name: "Without" });
    vi.mocked(ChannelsRepository.listChannelsForUser).mockResolvedValue([withoutMessage, withMessage] as any);

    const result = await ChannelsService.listChannels(USER_ID, mockPrisma);

    expect(result[0].id).toBe("channel-with");
    expect(result[1].id).toBe("channel-without");
  });

  it("deduplicates DM channels for the same partner, keeping the most recent", async () => {
    const older = makeMembershipRow({
      channelId: "dm-old",
      type: "DM",
      dmPartner: { id: PARTNER_ID, username: "bob" },
      lastMessage: { content: "old", author: { username: "bob" }, createdAt: new Date("2024-01-01") },
    });
    const newer = makeMembershipRow({
      channelId: "dm-new",
      type: "DM",
      dmPartner: { id: PARTNER_ID, username: "bob" },
      lastMessage: { content: "new", author: { username: "bob" }, createdAt: new Date("2024-06-01") },
    });
    vi.mocked(ChannelsRepository.listChannelsForUser).mockResolvedValue([older, newer] as any);

    const result = await ChannelsService.listChannels(USER_ID, mockPrisma);
    const dms = result.filter((ch) => ch.type === "DM");

    expect(dms).toHaveLength(1);
    expect(dms[0].id).toBe("dm-new");
  });

  it("uses 'Deleted User' as authorUsername when the message author is null", async () => {
    const row = makeMembershipRow({
      type: "ROOM",
      lastMessage: { content: "hello", author: null, createdAt: new Date() },
    });
    vi.mocked(ChannelsRepository.listChannelsForUser).mockResolvedValue([row as any]);

    const [ch] = await ChannelsService.listChannels(USER_ID, mockPrisma);

    expect(ch.latestMessage?.authorUsername).toBe("Deleted User");
  });
});

describe("createRoom", () => {
  it("creates a room with the user as owner", async () => {
    vi.mocked(ChannelsRepository.createRoom).mockResolvedValue(mockRoom as any);

    const result = await ChannelsService.createRoom(USER_ID, { name: "General" }, mockPrisma);

    expect(ChannelsRepository.createRoom).toHaveBeenCalledWith(mockPrisma, { name: "General", ownerId: USER_ID });
    expect(result).toEqual(mockRoom);
  });
});

describe("getChannel", () => {
  it("throws ForbiddenError when user is not a member", async () => {
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(null);

    await expect(ChannelsService.getChannel(CHANNEL_ID, USER_ID, mockPrisma)).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when channel does not exist", async () => {
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(mockMembership as any);
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(null);

    await expect(ChannelsService.getChannel(CHANNEL_ID, USER_ID, mockPrisma)).rejects.toThrow(NotFoundError);
  });

  it("returns channel for a member", async () => {
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(mockMembership as any);
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);

    const result = await ChannelsService.getChannel(CHANNEL_ID, USER_ID, mockPrisma);
    expect(result).toEqual(mockRoom);
  });
});

describe("joinRoom", () => {
  it("throws ConflictError when already a member", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(mockMembership as any);

    await expect(ChannelsService.joinRoom(CHANNEL_ID, USER_ID, mockPrisma)).rejects.toThrow(ConflictError);
  });

  it("throws ForbiddenError when trying to join a DM", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockDirectChannel as any);

    await expect(ChannelsService.joinRoom(CHANNEL_ID, USER_ID, mockPrisma)).rejects.toThrow(ForbiddenError);
  });
});

describe("leaveRoom", () => {
  it("throws ForbiddenError when owner tries to leave", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);

    await expect(ChannelsService.leaveRoom(CHANNEL_ID, USER_ID, mockPrisma)).rejects.toThrow(ForbiddenError);
  });
});

describe("getOrCreateDirectChannel", () => {
  it("throws ForbiddenError when DMing yourself", async () => {
    await expect(
      ChannelsService.getOrCreateDirectChannel(USER_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("creates or returns a direct channel with any user", async () => {
    vi.mocked(ChannelsRepository.findOrCreateDirectChannel).mockResolvedValue(mockDirectChannel as any);

    const result = await ChannelsService.getOrCreateDirectChannel(USER_ID, PARTNER_ID, mockPrisma);

    expect(ChannelsRepository.findOrCreateDirectChannel).toHaveBeenCalledWith(mockPrisma, USER_ID, PARTNER_ID);
    expect(result).toEqual(mockDirectChannel);
  });
});

describe("updateRoom", () => {
  it("throws NotFoundError when channel does not exist", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(null);

    await expect(
      ChannelsService.updateRoom(CHANNEL_ID, USER_ID, { name: "New Name" }, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when channel is a DM", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockDirectChannel as any);

    await expect(
      ChannelsService.updateRoom(CHANNEL_ID, USER_ID, { name: "New Name" }, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when non-owner tries to update", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue({
      ...mockRoom,
      ownerId: "other-user",
    } as any);

    await expect(
      ChannelsService.updateRoom(CHANNEL_ID, USER_ID, { name: "New Name" }, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("updates the room when called by owner", async () => {
    const updated = { ...mockRoom, name: "New Name" };
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);
    vi.mocked(ChannelsRepository.updateRoom).mockResolvedValue(updated as any);

    const result = await ChannelsService.updateRoom(CHANNEL_ID, USER_ID, { name: "New Name" }, mockPrisma);

    expect(ChannelsRepository.updateRoom).toHaveBeenCalledWith(mockPrisma, CHANNEL_ID, { name: "New Name" });
    expect(result).toEqual(updated);
  });
});

describe("deleteRoom", () => {
  it("throws NotFoundError when channel does not exist", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(null);

    await expect(ChannelsService.deleteRoom(CHANNEL_ID, USER_ID, mockPrisma)).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when channel is a DM", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockDirectChannel as any);

    await expect(ChannelsService.deleteRoom(CHANNEL_ID, USER_ID, mockPrisma)).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when non-owner tries to delete", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue({
      ...mockRoom,
      ownerId: "other-user",
    } as any);

    await expect(ChannelsService.deleteRoom(CHANNEL_ID, USER_ID, mockPrisma)).rejects.toThrow(ForbiddenError);
  });

  it("deletes the room when called by owner", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);
    vi.mocked(ChannelsRepository.deleteChannel).mockResolvedValue(undefined as any);

    await ChannelsService.deleteRoom(CHANNEL_ID, USER_ID, mockPrisma);

    expect(ChannelsRepository.deleteChannel).toHaveBeenCalledWith(mockPrisma, CHANNEL_ID);
  });
});

describe("kickMember", () => {
  const TARGET_ID = "user-3";

  it("throws NotFoundError when channel does not exist", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(null);

    await expect(
      ChannelsService.kickMember(CHANNEL_ID, USER_ID, TARGET_ID, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when non-owner tries to kick", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue({
      ...mockRoom,
      ownerId: "other-user",
    } as any);

    await expect(
      ChannelsService.kickMember(CHANNEL_ID, USER_ID, TARGET_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when owner tries to kick themselves", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);

    await expect(
      ChannelsService.kickMember(CHANNEL_ID, USER_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when target is not a member", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(null);

    await expect(
      ChannelsService.kickMember(CHANNEL_ID, USER_ID, TARGET_ID, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("removes the member when called by owner", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(mockMembership as any);
    vi.mocked(ChannelsRepository.deleteMembership).mockResolvedValue(undefined as any);

    await ChannelsService.kickMember(CHANNEL_ID, USER_ID, TARGET_ID, mockPrisma);

    expect(ChannelsRepository.deleteMembership).toHaveBeenCalledWith(mockPrisma, CHANNEL_ID, TARGET_ID);
  });
});

describe("sendInvite", () => {
  const INVITEE_ID = "user-3";

  it("throws NotFoundError when channel does not exist", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(null);

    await expect(
      ChannelsService.sendInvite(CHANNEL_ID, USER_ID, INVITEE_ID, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when channel is a DM", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockDirectChannel as any);

    await expect(
      ChannelsService.sendInvite(CHANNEL_ID, USER_ID, INVITEE_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when non-owner tries to invite", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue({
      ...mockRoom,
      ownerId: "other-user",
    } as any);

    await expect(
      ChannelsService.sendInvite(CHANNEL_ID, USER_ID, INVITEE_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when owner invites themselves", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);

    await expect(
      ChannelsService.sendInvite(CHANNEL_ID, USER_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws ConflictError when invitee is already a member", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(mockMembership as any);

    await expect(
      ChannelsService.sendInvite(CHANNEL_ID, USER_ID, INVITEE_ID, mockPrisma)
    ).rejects.toThrow(ConflictError);
  });

  it("throws ConflictError when a pending invite already exists", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(null);
    vi.mocked(ChannelsRepository.findPendingInvite).mockResolvedValue({ id: "invite-1" } as any);

    await expect(
      ChannelsService.sendInvite(CHANNEL_ID, USER_ID, INVITEE_ID, mockPrisma)
    ).rejects.toThrow(ConflictError);
  });

  it("creates an invite when all checks pass", async () => {
    vi.mocked(ChannelsRepository.findChannelById).mockResolvedValue(mockRoom as any);
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(null);
    vi.mocked(ChannelsRepository.findPendingInvite).mockResolvedValue(null);
    vi.mocked(ChannelsRepository.createInvite).mockResolvedValue(undefined as any);

    await ChannelsService.sendInvite(CHANNEL_ID, USER_ID, INVITEE_ID, mockPrisma);

    expect(ChannelsRepository.createInvite).toHaveBeenCalledWith(mockPrisma, CHANNEL_ID, USER_ID, INVITEE_ID);
  });
});

describe("acceptInvite", () => {
  const INVITE_ID = "invite-1";
  const mockInvite = {
    id: INVITE_ID,
    channelId: CHANNEL_ID,
    inviteeId: USER_ID,
    status: "PENDING" as const,
    channel: { type: "ROOM" as const },
  };

  it("throws NotFoundError when invite does not exist", async () => {
    vi.mocked(ChannelsRepository.findInviteById).mockResolvedValue(null);

    await expect(ChannelsService.acceptInvite(INVITE_ID, USER_ID, mockPrisma)).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when invite is for someone else", async () => {
    vi.mocked(ChannelsRepository.findInviteById).mockResolvedValue({
      ...mockInvite,
      inviteeId: "other-user",
    } as any);

    await expect(ChannelsService.acceptInvite(INVITE_ID, USER_ID, mockPrisma)).rejects.toThrow(ForbiddenError);
  });

  it("throws ConflictError when invite is not pending", async () => {
    vi.mocked(ChannelsRepository.findInviteById).mockResolvedValue({
      ...mockInvite,
      status: "ACCEPTED",
    } as any);

    await expect(ChannelsService.acceptInvite(INVITE_ID, USER_ID, mockPrisma)).rejects.toThrow(ConflictError);
  });

  it("adds the user to the channel and marks invite accepted", async () => {
    vi.mocked(ChannelsRepository.findInviteById).mockResolvedValue(mockInvite as any);
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(null);
    vi.mocked(ChannelsRepository.createMembership).mockResolvedValue(undefined as any);
    vi.mocked(ChannelsRepository.updateInviteStatus).mockResolvedValue(undefined as any);

    await ChannelsService.acceptInvite(INVITE_ID, USER_ID, mockPrisma);

    expect(ChannelsRepository.createMembership).toHaveBeenCalledWith(mockPrisma, CHANNEL_ID, USER_ID);
    expect(ChannelsRepository.updateInviteStatus).toHaveBeenCalledWith(mockPrisma, INVITE_ID, "ACCEPTED");
  });
});

describe("declineInvite", () => {
  const INVITE_ID = "invite-1";
  const mockInvite = {
    id: INVITE_ID,
    channelId: CHANNEL_ID,
    inviteeId: USER_ID,
    status: "PENDING" as const,
  };

  it("throws NotFoundError when invite does not exist", async () => {
    vi.mocked(ChannelsRepository.findInviteById).mockResolvedValue(null);

    await expect(ChannelsService.declineInvite(INVITE_ID, USER_ID, mockPrisma)).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when invite is for someone else", async () => {
    vi.mocked(ChannelsRepository.findInviteById).mockResolvedValue({
      ...mockInvite,
      inviteeId: "other-user",
    } as any);

    await expect(ChannelsService.declineInvite(INVITE_ID, USER_ID, mockPrisma)).rejects.toThrow(ForbiddenError);
  });

  it("throws ConflictError when invite is not pending", async () => {
    vi.mocked(ChannelsRepository.findInviteById).mockResolvedValue({
      ...mockInvite,
      status: "DECLINED",
    } as any);

    await expect(ChannelsService.declineInvite(INVITE_ID, USER_ID, mockPrisma)).rejects.toThrow(ConflictError);
  });

  it("marks the invite as declined", async () => {
    vi.mocked(ChannelsRepository.findInviteById).mockResolvedValue(mockInvite as any);
    vi.mocked(ChannelsRepository.updateInviteStatus).mockResolvedValue(undefined as any);

    await ChannelsService.declineInvite(INVITE_ID, USER_ID, mockPrisma);

    expect(ChannelsRepository.updateInviteStatus).toHaveBeenCalledWith(mockPrisma, INVITE_ID, "DECLINED");
  });
});

describe("markRead", () => {
  it("throws ForbiddenError when user is not a channel member", async () => {
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(null);

    await expect(
      ChannelsService.markRead(CHANNEL_ID, USER_ID, MESSAGE_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("marks the channel as read for a member", async () => {
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(mockMembership as any);
    vi.mocked(ReadTrackingRepository.markMemberRead).mockResolvedValue(undefined as any);

    await ChannelsService.markRead(CHANNEL_ID, USER_ID, MESSAGE_ID, mockPrisma);

    expect(ReadTrackingRepository.markMemberRead).toHaveBeenCalledWith(mockPrisma, CHANNEL_ID, USER_ID, MESSAGE_ID);
  });
});
