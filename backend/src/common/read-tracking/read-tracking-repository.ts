import { PrismaClient } from "generated/prisma/client";

export function markMemberRead(
  prisma: PrismaClient,
  channelId: string,
  userId: string,
  messageId: string
) {
  return prisma.channelMember.update({
    where: { channelId_userId: { channelId, userId } },
    data: { lastReadMessageId: messageId },
  });
}

export function countUnreadMessages(
  prisma: PrismaClient,
  channelId: string,
  afterDate: Date | null
) {
  return prisma.message.count({
    where: {
      channelId,
      deletedAt: null,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
  });
}
