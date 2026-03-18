import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { createPrismaClient } from "@common/utils/create-prisma-client";
import { broadcastToChannel } from "@common/broadcast/broadcast-service";
import { wsDefaultConfig } from "@features/websockets/ws-config";
import { updateHeartbeat } from "@features/websockets/ws-repository";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const body = JSON.parse(event.body ?? "{}") as { type?: string; channelId?: string };

  const prisma = createPrismaClient(wsDefaultConfig.DATABASE_URL);
  const client = new ApiGatewayManagementApiClient({ endpoint: wsDefaultConfig.WS_CALLBACK_URL });

  try {
    const connection = await prisma.webSocketConnection.findUnique({
      where: { connectionId },
      select: { userId: true, user: { select: { username: true } } },
    });

    if (!connection) return { statusCode: 410, body: "Gone" };

    if (body.type === "ping") {
      await updateHeartbeat(prisma, connectionId);
      await client.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({ type: "pong" })),
      }));
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
        connection.userId // don't echo back to sender
      );
    }
  } finally {
    await prisma.$disconnect();
  }

  return { statusCode: 200, body: "OK" };
};
