import {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import jwt from "jsonwebtoken";
import { createPrismaClient } from "@common/utils/create-prisma-client";
import { wsConnectConfig } from "@features/websockets/ws-config";
import { createConnection } from "@features/websockets/ws-repository";

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
  } finally {
    await prisma.$disconnect();
  }

  return { statusCode: 200, body: "Connected" };
};
