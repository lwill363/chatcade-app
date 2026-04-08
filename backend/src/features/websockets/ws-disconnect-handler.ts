import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { createPrismaClient } from "@common/utils/create-prisma-client";
import { wsConnectConfig } from "@features/websockets/ws-config";
import { deleteConnection, findConnectionsByUserIds } from "@features/websockets/ws-repository";
import { broadcastPresence } from "@features/websockets/ws-presence";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const prisma = createPrismaClient(wsConnectConfig.DATABASE_URL);
  try {
    // Find the userId before deleting the connection
    const conn = await prisma.webSocketConnection.findUnique({
      where: { connectionId: event.requestContext.connectionId },
      select: { userId: true },
    });

    await deleteConnection(prisma, event.requestContext.connectionId);

    if (conn) {
      // Only broadcast offline if user has no other active connections
      const remaining = await findConnectionsByUserIds(prisma, [conn.userId]);
      if (remaining.length === 0) {
        void broadcastPresence(prisma, wsConnectConfig.WS_CALLBACK_URL, conn.userId, false);
      }
    }
  } catch (err) {
    console.error(`[ws-disconnect] error for connection ${event.requestContext.connectionId}:`, err);
  } finally {
    await prisma.$disconnect();
  }

  return { statusCode: 200, body: "Disconnected" };
};
