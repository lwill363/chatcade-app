import { describe, it, expect, vi, beforeEach } from "vitest";
import * as MessagesService from "./messages-service";
import * as MessagesRepository from "./messages-repository";
import { ForbiddenError, NotFoundError } from "@common/errors";

vi.mock("./messages-repository");

const mockPrisma = {} as any;

const SPACE_ID = "space-1";
const USER_ID = "user-1";
const MSG_ID = "msg-1";

const mockMessage = {
  id: MSG_ID,
  content: "Hello",
  spaceId: SPACE_ID,
  authorId: USER_ID,
  editedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: USER_ID, username: "alice" },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("sendMessage", () => {
  it("sends a message when user is a space member", async () => {
    vi.mocked(MessagesRepository.findSpaceMembership).mockResolvedValue({ spaceId: SPACE_ID });
    vi.mocked(MessagesRepository.create).mockResolvedValue(mockMessage);

    const result = await MessagesService.sendMessage(SPACE_ID, USER_ID, "Hello", mockPrisma);

    expect(MessagesRepository.create).toHaveBeenCalledWith(mockPrisma, {
      content: "Hello",
      spaceId: SPACE_ID,
      authorId: USER_ID,
    });
    expect(result).toEqual(mockMessage);
  });

  it("throws ForbiddenError when user is not a member", async () => {
    vi.mocked(MessagesRepository.findSpaceMembership).mockResolvedValue(null);

    await expect(
      MessagesService.sendMessage(SPACE_ID, USER_ID, "Hello", mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("listMessages", () => {
  it("lists messages for a member", async () => {
    vi.mocked(MessagesRepository.findSpaceMembership).mockResolvedValue({ spaceId: SPACE_ID });
    vi.mocked(MessagesRepository.findMany).mockResolvedValue([mockMessage]);

    const result = await MessagesService.listMessages(SPACE_ID, USER_ID, { limit: 50 }, mockPrisma);

    expect(MessagesRepository.findMany).toHaveBeenCalledWith(mockPrisma, SPACE_ID, { limit: 50 });
    expect(result).toEqual([mockMessage]);
  });

  it("throws ForbiddenError when user is not a member", async () => {
    vi.mocked(MessagesRepository.findSpaceMembership).mockResolvedValue(null);

    await expect(
      MessagesService.listMessages(SPACE_ID, USER_ID, { limit: 50 }, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("editMessage", () => {
  it("edits a message authored by the user", async () => {
    vi.mocked(MessagesRepository.findById).mockResolvedValue({
      id: MSG_ID,
      authorId: USER_ID,
      spaceId: SPACE_ID,
    });
    vi.mocked(MessagesRepository.update).mockResolvedValue({ ...mockMessage, content: "Edited" });

    const result = await MessagesService.editMessage(MSG_ID, USER_ID, "Edited", mockPrisma);

    expect(MessagesRepository.update).toHaveBeenCalledWith(mockPrisma, MSG_ID, "Edited");
    expect(result.content).toBe("Edited");
  });

  it("throws NotFoundError when message does not exist", async () => {
    vi.mocked(MessagesRepository.findById).mockResolvedValue(null);

    await expect(
      MessagesService.editMessage(MSG_ID, USER_ID, "Edited", mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ForbiddenError when user is not the author", async () => {
    vi.mocked(MessagesRepository.findById).mockResolvedValue({
      id: MSG_ID,
      authorId: "other-user",
      spaceId: SPACE_ID,
    });

    await expect(
      MessagesService.editMessage(MSG_ID, USER_ID, "Edited", mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("deleteMessage", () => {
  it("allows the author to delete their message", async () => {
    vi.mocked(MessagesRepository.findById).mockResolvedValue({
      id: MSG_ID,
      authorId: USER_ID,
      spaceId: SPACE_ID,
    });
    vi.mocked(MessagesRepository.deleteMessage).mockResolvedValue(undefined as any);

    await MessagesService.deleteMessage(MSG_ID, USER_ID, mockPrisma);

    expect(MessagesRepository.deleteMessage).toHaveBeenCalledWith(mockPrisma, MSG_ID);
  });

  it("allows the space owner to delete any message", async () => {
    const OWNER_ID = "owner-1";
    vi.mocked(MessagesRepository.findById).mockResolvedValue({
      id: MSG_ID,
      authorId: "another-user",
      spaceId: SPACE_ID,
    });
    vi.mocked(MessagesRepository.findSpaceOwner).mockResolvedValue({ ownerId: OWNER_ID });
    vi.mocked(MessagesRepository.deleteMessage).mockResolvedValue(undefined as any);

    await MessagesService.deleteMessage(MSG_ID, OWNER_ID, mockPrisma);

    expect(MessagesRepository.deleteMessage).toHaveBeenCalledWith(mockPrisma, MSG_ID);
  });

  it("throws ForbiddenError when non-author non-owner tries to delete", async () => {
    vi.mocked(MessagesRepository.findById).mockResolvedValue({
      id: MSG_ID,
      authorId: "another-user",
      spaceId: SPACE_ID,
    });
    vi.mocked(MessagesRepository.findSpaceOwner).mockResolvedValue({ ownerId: "owner-1" });

    await expect(
      MessagesService.deleteMessage(MSG_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when message does not exist", async () => {
    vi.mocked(MessagesRepository.findById).mockResolvedValue(null);

    await expect(
      MessagesService.deleteMessage(MSG_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(NotFoundError);
  });
});

describe("markSpaceRead", () => {
  it("marks space as read for a member", async () => {
    vi.mocked(MessagesRepository.findSpaceMembership).mockResolvedValue({ spaceId: SPACE_ID });
    vi.mocked(MessagesRepository.markSpaceRead).mockResolvedValue(undefined as any);

    await MessagesService.markSpaceRead(SPACE_ID, USER_ID, mockPrisma);

    expect(MessagesRepository.markSpaceRead).toHaveBeenCalledWith(mockPrisma, USER_ID, SPACE_ID);
  });

  it("throws ForbiddenError when user is not a member", async () => {
    vi.mocked(MessagesRepository.findSpaceMembership).mockResolvedValue(null);

    await expect(
      MessagesService.markSpaceRead(SPACE_ID, USER_ID, mockPrisma)
    ).rejects.toThrow(ForbiddenError);
  });
});
