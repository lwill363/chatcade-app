import prismaPlugin from "@common/plugins/prisma-plugin";
import { createLambdaHandler } from "@common/utils/create-lambda-handler";
import { friendsConfig } from "@features/friends/friends-config";
import { friendsRoutes } from "@features/friends/friends-routes";

export const handler = createLambdaHandler((app) => {
  app.register(prismaPlugin, { databaseUrl: friendsConfig.DATABASE_URL });
  app.register(friendsRoutes, { prefix: "/api" });
});
