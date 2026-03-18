import { createPrismaClient } from "@common/utils/create-prisma-client";
import { wsConnectConfig } from "@features/websockets/ws-config";
import { deleteStaleConnections } from "@features/websockets/ws-repository";

// Triggered by EventBridge on a schedule — removes connections with no heartbeat
// in the last 2 minutes (handles Lambda crashes and unclean disconnects).
export const handler = async (): Promise<void> => {
  const prisma = createPrismaClient(wsConnectConfig.DATABASE_URL);
  try {
    const result = await deleteStaleConnections(prisma);
    console.log(`Cleaned up ${result.count} stale WebSocket connections`);
  } finally {
    await prisma.$disconnect();
  }
};
