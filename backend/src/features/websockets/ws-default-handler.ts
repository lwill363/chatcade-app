import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { ApiGatewayManagementApiClient, PostToConnectionCommand, GoneException } from "@aws-sdk/client-apigatewaymanagementapi";
import { createPrismaClient } from "@common/utils/create-prisma-client";
import { broadcastToChannel } from "@common/broadcast/broadcast-service";
import { wsDefaultConfig } from "@features/websockets/ws-config";
import { updateHeartbeat, deleteConnection } from "@features/websockets/ws-repository";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  // Always return 200 — any unhandled throw becomes a 502 from API Gateway,
  // which closes the WebSocket and triggers a reconnect loop on the client.
  let body: { type?: string; channelId?: string } = {};
  try {
    body = JSON.parse(event.body ?? "{}") as typeof body;
  } catch {
    return { statusCode: 200, body: "OK" };
  }

  const prisma = createPrismaClient(wsDefaultConfig.DATABASE_URL);
  const client = new ApiGatewayManagementApiClient({ endpoint: wsDefaultConfig.WS_CALLBACK_URL });

  try {
    const connection = await prisma.webSocketConnection.findUnique({
      where: { connectionId },
      select: { userId: true, user: { select: { username: true } } },
    });

    if (!connection) return { statusCode: 200, body: "OK" };

    if (body.type === "ping") {
      await updateHeartbeat(prisma, connectionId);
      try {
        await client.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify({ type: "pong" })),
        }));
      } catch (err) {
        if (err instanceof GoneException) {
          await deleteConnection(prisma, connectionId);
        }
      }
    } else if ((body.type === "typing.start" || body.type === "typing.stop") && body.channelId) {
      await broadcastToChannel(
        prisma,
        wsDefaultConfig.WS_CALLBACK_URL,
        body.channelId,
        {
          type: body.type,
          channelId: body.channelId,
          userId: connection.userId,
          ...(body.type === "typing.start" ? { username: connection.user.username } : {}),
        } as Parameters<typeof broadcastToChannel>[3],
        connection.userId
      );
    }
  } catch (err) {
    console.error(`[ws-default] unhandled error for connection ${connectionId}:`, err);
  } finally {
    await prisma.$disconnect();
  }

  return { statusCode: 200, body: "OK" };
};
