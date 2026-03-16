import { PrismaClient } from "generated/prisma/client";

const MESSAGE_SELECT = {
  id: true,
  type: true,
  content: true,
  metadata: true,
  channelId: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, username: true } },
} as const;

export function findMembership(prisma: PrismaClient, channelId: string, userId: string) {
  return prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { channelId: true },
  });
}

export function findChannelOwner(prisma: PrismaClient, channelId: string) {
  return prisma.channel.findUnique({
    where: { id: channelId },
    select: { ownerId: true },
  });
}

export async function createMessage(
  prisma: PrismaClient,
  data: { content: string; channelId: string; authorId: string }
) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({ data, select: MESSAGE_SELECT });
    await tx.channel.update({
      where: { id: data.channelId },
      data: { lastMessageId: message.id },
    });
    return message;
  });
}

export function createSystemMessage(
  prisma: PrismaClient,
  data: { channelId: string; authorId: string; content: "joined" | "left" | "removed" }
) {
  return prisma.message.create({ data: { ...data, type: "SYSTEM" }, select: MESSAGE_SELECT });
}

export async function findMessages(
  prisma: PrismaClient,
  channelId: string,
  options: { limit: number; before?: string }
) {
  let cursorCondition: { createdAt?: { lt: Date } } = {};

  if (options.before) {
    const cursor = await prisma.message.findUnique({
      where: { id: options.before },
      select: { createdAt: true },
    });
    if (cursor) cursorCondition = { createdAt: { lt: cursor.createdAt } };
  }

  const messages = await prisma.message.findMany({
    where: { channelId, ...cursorCondition },
    select: MESSAGE_SELECT,
    orderBy: { createdAt: "desc" },
    take: options.limit,
  });

  return messages.reverse();
}

export function findMessageById(prisma: PrismaClient, id: string) {
  return prisma.message.findUnique({
    where: { id },
    select: { id: true, authorId: true, channelId: true, deletedAt: true },
  });
}

export function updateMessage(prisma: PrismaClient, id: string, content: string) {
  return prisma.message.update({
    where: { id },
    data: { content, editedAt: new Date() },
    select: MESSAGE_SELECT,
  });
}

export async function deleteMessage(prisma: PrismaClient, id: string) {
  return prisma.$transaction(async (tx) => {
    const msg = await tx.message.findUnique({
      where: { id },
      select: { channelId: true, channel: { select: { lastMessageId: true } } },
    });

    await tx.message.update({
      where: { id },
      data: { deletedAt: new Date(), content: "" },
    });

    // If this was the last message, point to the previous non-deleted message
    if (msg && msg.channel.lastMessageId === id) {
      const prev = await tx.message.findFirst({
        where: { channelId: msg.channelId, id: { not: id }, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      await tx.channel.update({
        where: { id: msg.channelId },
        data: { lastMessageId: prev?.id ?? null },
      });
    }
  });
}
