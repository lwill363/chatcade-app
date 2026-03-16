import prismaPlugin from "@common/plugins/prisma-plugin";
import { createLambdaHandler } from "@common/utils/create-lambda-handler";
import { messagesConfig } from "@features/messages/messages-config";
import { messagesRoutes } from "@features/messages/messages-routes";

export const handler = createLambdaHandler((app) => {
  app.register(prismaPlugin, { databaseUrl: messagesConfig.DATABASE_URL });
  app.register(messagesRoutes, { prefix: "/api" });
});
