import { PrismaClient } from "generated/prisma/client";

export function findMembership(prisma: PrismaClient, channelId: string, userId: string) {
  return prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { channelId: true },
  });
}
