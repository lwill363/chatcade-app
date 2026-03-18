import { PrismaClient } from "generated/prisma/client";

export function createConnection(prisma: PrismaClient, connectionId: string, userId: string) {
  return prisma.webSocketConnection.create({
    data: { connectionId, userId },
  });
}

export function deleteConnection(prisma: PrismaClient, connectionId: string) {
  return prisma.webSocketConnection.deleteMany({
    where: { connectionId },
  });
}

export function updateHeartbeat(prisma: PrismaClient, connectionId: string) {
  return prisma.webSocketConnection.update({
    where: { connectionId },
    data: { lastHeartbeatAt: new Date() },
  });
}

// Find all connections for a set of users — used for broadcasting to channel members
export function findConnectionsByUserIds(prisma: PrismaClient, userIds: string[]) {
  return prisma.webSocketConnection.findMany({
    where: { userId: { in: userIds } },
    select: { connectionId: true, userId: true },
  });
}

// Delete connections with no heartbeat in the last 2 minutes — stale/crashed connections
export function deleteStaleConnections(prisma: PrismaClient) {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);
  return prisma.webSocketConnection.deleteMany({
    where: { lastHeartbeatAt: { lt: cutoff } },
  });
}
