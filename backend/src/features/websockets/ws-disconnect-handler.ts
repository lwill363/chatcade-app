import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { createPrismaClient } from "@common/utils/create-prisma-client";
import { wsConnectConfig } from "@features/websockets/ws-config";
import { deleteConnection } from "@features/websockets/ws-repository";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const prisma = createPrismaClient(wsConnectConfig.DATABASE_URL);
  try {
    await deleteConnection(prisma, event.requestContext.connectionId);
  } finally {
    await prisma.$disconnect();
  }

  return { statusCode: 200, body: "Disconnected" };
};
