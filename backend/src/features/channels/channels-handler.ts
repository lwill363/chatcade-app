import prismaPlugin from "@common/plugins/prisma-plugin";
import { createLambdaHandler } from "@common/utils/create-lambda-handler";
import { channelsConfig } from "@features/channels/channels-config";
import { channelsRoutes } from "@features/channels/channels-routes";

export const handler = createLambdaHandler((app) => {
  app.register(prismaPlugin, { databaseUrl: channelsConfig.DATABASE_URL });
  app.register(channelsRoutes, { prefix: "/api" });
});
