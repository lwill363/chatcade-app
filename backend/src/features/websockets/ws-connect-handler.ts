import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import jwt from "jsonwebtoken";
import { createPrismaClient } from "@common/utils/create-prisma-client";
import { wsConnectConfig } from "@features/websockets/ws-config";
import { createConnection } from "@features/websockets/ws-repository";
import { broadcastPresence } from "@features/websockets/ws-presence";

// @types/aws-lambda omits queryStringParameters from the WebSocket event type,
// but API Gateway does pass it on $connect requests.
type WsConnectEvent = APIGatewayProxyWebsocketEventV2 & {
  queryStringParameters?: Record<string, string>;
};

export const handler = async (
  event: WsConnectEvent,
): Promise<APIGatewayProxyResultV2> => {
  const token = event.queryStringParameters?.token;
  if (!token) return { statusCode: 401, body: "Unauthorized" };

  let userId: string;
  try {
    const payload = jwt.verify(token, wsConnectConfig.JWT_SECRET) as {
      sub: string;
    };
    userId = payload.sub;
  } catch {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const prisma = createPrismaClient(wsConnectConfig.DATABASE_URL);
  try {
    await createConnection(prisma, event.requestContext.connectionId, userId);
    // Awaited so Lambda doesn't return before presence is broadcast.
    // PostToConnectionCommand has SDK-level timeouts (connectionTimeout: 2000,
    // requestTimeout: 4000) in broadcast-service.ts so this won't block $disconnect().
    await broadcastPresence(prisma, wsConnectConfig.WS_CALLBACK_URL, userId);
  } catch (err) {
    console.error(`[ws-connect] error for connection ${event.requestContext.connectionId}:`, err);
  } finally {
    await prisma.$disconnect();
  }

  return { statusCode: 200, body: "Connected" };
};
