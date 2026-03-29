import { describe, it, expect, vi, beforeEach } from "vitest";
import * as MessagesService from "./messages-service";
import * as MessagesRepository from "./messages-repository";
import * as MembershipRepository from "@common/membership/membership-repository";
import { ForbiddenError, NotFoundError } from "@common/errors";
import { IDS, mockPrisma, makeMessage, makeMembership } from "@test/factories";

vi.mock("./messages-repository");
vi.mock("@common/membership/membership-repository");
vi.mock("@features/messages/messages-config", () => ({
  messagesConfig: { WS_CALLBACK_URL: "http://test-callback" },
}));
vi.mock("@common/broadcast/broadcast-service", () => ({
  broadcastToUsers: vi.fn().mockResolvedValue(undefined),
  broadcastToChannel: vi.fn().mockResolvedValue(undefined),
}));

const CHANNEL_ID = IDS.CHANNEL;
const USER_ID = IDS.USER;
const PARTNER_ID = IDS.PARTNER;
const MESSAGE_ID = IDS.MESSAGE;

const mockMessage = makeMessage();
const mockMembership = makeMembership();

beforeEach(() => {
  vi.resetAllMocks();
});

describe("sendMessage", () => {
  it("throws ForbiddenError when user is not a channel member", async () => {
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(null);

    await expect(
      MessagesService.sendMessage(CHANNEL_ID, USER_ID, "Hello", mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("creates a message for a channel member", async () => {
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(mockMembership as any);
    vi.mocked(MessagesRepository.createMessage).mockResolvedValue(mockMessage as any);

    const result = await MessagesService.sendMessage(CHANNEL_ID, USER_ID, "Hello", mockPrisma);

    expect(MessagesRepository.createMessage).toHaveBeenCalledWith(mockPrisma, {
      content: "Hello",
      channelId: CHANNEL_ID,
      authorId: USER_ID,
    });
    expect(result).toEqual(mockMessage);
  });
});

describe("listMessages", () => {
  it("throws ForbiddenError when user is not a channel member", async () => {
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(null);

    await expect(
      MessagesService.listMessages(CHANNEL_ID, USER_ID, { limit: 50 }, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("returns messages for a channel member", async () => {
    vi.mocked(MembershipRepository.findMembership).mockResolvedValue(mockMembership as any);
    vi.mocked(MessagesRepository.findMessages).mockResolvedValue([mockMessage] as any);

    const result = await MessagesService.listMessages(CHANNEL_ID, USER_ID, { limit: 50 }, mockPrisma);

    expect(MessagesRepository.findMessages).toHaveBeenCalledWith(mockPrisma, CHANNEL_ID, { limit: 50 });
    expect(result).toEqual([mockMessage]);
  });
});

describe("editMessage", () => {
  it("throws NotFoundError when message does not exist", async () => {
    vi.mocked(MessagesRepository.findMessageById).mockResolvedValue(null);

    await expect(
      MessagesService.editMessage(MESSAGE_ID, USER_ID, "Updated", mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when editing another user's message", async () => {
    vi.mocked(MessagesRepository.findMessageById).mockResolvedValue({
      ...mockMessage,
      authorId: PARTNER_ID,
    } as any);

    await expect(
      MessagesService.editMessage(MESSAGE_ID, USER_ID, "Updated", mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("edits own message", async () => {
    const updated = { ...mockMessage, content: "Updated" };
    vi.mocked(MessagesRepository.findMessageById).mockResolvedValue(mockMessage as any);
    vi.mocked(MessagesRepository.updateMessage).mockResolvedValue(updated as any);

    const result = await MessagesService.editMessage(MESSAGE_ID, USER_ID, "Updated", mockPrisma);

    expect(MessagesRepository.updateMessage).toHaveBeenCalledWith(mockPrisma, MESSAGE_ID, "Updated");
    expect(result).toEqual(updated);
  });
});

describe("deleteMessage", () => {
  it("throws NotFoundError when message does not exist", async () => {
    vi.mocked(MessagesRepository.findMessageById).mockResolvedValue(null);

    await expect(
      MessagesService.deleteMessage(MESSAGE_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("allows author to delete their own message", async () => {
    vi.mocked(MessagesRepository.findMessageById).mockResolvedValue(mockMessage as any);
    vi.mocked(MessagesRepository.deleteMessage).mockResolvedValue(undefined as any);

    await MessagesService.deleteMessage(MESSAGE_ID, USER_ID, mockPrisma);

    expect(MessagesRepository.deleteMessage).toHaveBeenCalledWith(mockPrisma, MESSAGE_ID);
  });

  it("allows room owner to delete another user's message", async () => {
    const OWNER_ID = "owner-1";
    vi.mocked(MessagesRepository.findMessageById).mockResolvedValue({
      ...mockMessage,
      authorId: PARTNER_ID,
    } as any);
    vi.mocked(MessagesRepository.findChannelOwner).mockResolvedValue({ ownerId: OWNER_ID } as any);
    vi.mocked(MessagesRepository.deleteMessage).mockResolvedValue(undefined as any);

    await MessagesService.deleteMessage(MESSAGE_ID, OWNER_ID, mockPrisma);

    expect(MessagesRepository.deleteMessage).toHaveBeenCalledWith(mockPrisma, MESSAGE_ID);
  });

  it("throws ForbiddenError when non-author and non-room-owner tries to delete", async () => {
    vi.mocked(MessagesRepository.findMessageById).mockResolvedValue({
      ...mockMessage,
      authorId: PARTNER_ID,
    } as any);
    vi.mocked(MessagesRepository.findChannelOwner).mockResolvedValue({ ownerId: "someone-else" } as any);

    await expect(
      MessagesService.deleteMessage(MESSAGE_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });
});
