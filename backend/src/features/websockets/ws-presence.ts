import { PrismaClient } from "generated/prisma/client";
import { broadcastToUsers } from "@common/broadcast/broadcast-service";

export async function broadcastPresence(
  prisma: PrismaClient,
  callbackUrl: string,
  userId: string,
  isOnline = true
): Promise<void> {
  const memberships = await prisma.channelMember.findMany({
    where: { userId },
    select: { channel: { select: { members: { select: { userId: true } } } } },
  });

  const peerIds = [
    ...new Set(
      memberships
        .flatMap((m) => m.channel.members.map((cm) => cm.userId))
        .filter((id) => id !== userId)
    ),
  ];

  if (peerIds.length === 0) return;

  await broadcastToUsers(prisma, callbackUrl, peerIds, {
    type: "presence.updated",
    userId,
    isOnline,
    isAway: false,
  });
}
