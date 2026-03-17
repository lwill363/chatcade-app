import { PrismaClient } from "generated/prisma/client";
import * as MessagesRepository from "@features/messages/messages-repository";
import { findMembership } from "@common/membership/membership-repository";
import { ForbiddenError, NotFoundError } from "@common/errors";
import { ListMessagesQueryDTO } from "@features/messages/messages-types";

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
  return MessagesRepository.createMessage(prisma, { content, channelId, authorId: userId });
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
  return MessagesRepository.updateMessage(prisma, messageId, content);
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
}

