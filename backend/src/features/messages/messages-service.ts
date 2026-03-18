import { PrismaClient } from "generated/prisma/client";
import * as MessagesRepository from "@features/messages/messages-repository";
import { findMembership } from "@common/membership/membership-repository";
import { broadcastToChannel } from "@common/broadcast/broadcast-service";
import { ForbiddenError, NotFoundError } from "@common/errors";
import { ListMessagesQueryDTO } from "@features/messages/messages-types";
import { messagesConfig } from "@features/messages/messages-config";

async function assertMember(channelId: string, userId: string, prisma: PrismaClient) {
  const member = await findMembership(prisma, channelId, userId);
  if (!member) throw new ForbiddenError("You are not a member of this channel");
}

export async function sendMessage(
  channelId: string,
  userId: string,
  content: string,
  prisma: PrismaClient
) {
  await assertMember(channelId, userId, prisma);
  const message = await MessagesRepository.createMessage(prisma, { content, channelId, authorId: userId });
  void broadcastToChannel(prisma, messagesConfig.WS_CALLBACK_URL, channelId, {
    type: "message.created", channelId, message: message as Record<string, unknown>,
  });
  return message;
}

export async function listMessages(
  channelId: string,
  userId: string,
  options: ListMessagesQueryDTO,
  prisma: PrismaClient
) {
  await assertMember(channelId, userId, prisma);
  return MessagesRepository.findMessages(prisma, channelId, options);
}

export async function editMessage(
  messageId: string,
  userId: string,
  content: string,
  prisma: PrismaClient
) {
  const message = await MessagesRepository.findMessageById(prisma, messageId);
  if (!message) throw new NotFoundError("Message");
  if (message.deletedAt) throw new ForbiddenError("Cannot edit a deleted message");
  if (message.authorId !== userId) throw new ForbiddenError("You can only edit your own messages");
  const updated = await MessagesRepository.updateMessage(prisma, messageId, content);
  void broadcastToChannel(prisma, messagesConfig.WS_CALLBACK_URL, message.channelId, {
    type: "message.updated", channelId: message.channelId, message: updated as Record<string, unknown>,
  });
  return updated;
}

export async function deleteMessage(
  messageId: string,
  userId: string,
  prisma: PrismaClient
) {
  const message = await MessagesRepository.findMessageById(prisma, messageId);
  if (!message || message.deletedAt) throw new NotFoundError("Message");

  if (message.authorId !== userId) {
    const channel = await MessagesRepository.findChannelOwner(prisma, message.channelId);
    if (channel?.ownerId !== userId) {
      throw new ForbiddenError("You can only delete your own messages or messages in rooms you own");
    }
  }

  await MessagesRepository.deleteMessage(prisma, messageId);
  void broadcastToChannel(prisma, messagesConfig.WS_CALLBACK_URL, message.channelId, {
    type: "message.deleted", channelId: message.channelId, messageId,
  });
}

