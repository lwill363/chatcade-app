import prismaPlugin from "@common/plugins/prisma-plugin";
import { createLambdaHandler } from "@common/utils/create-lambda-handler";
import { gamesConfig } from "@features/games/games-config";
import { gamesRoutes } from "@features/games/games-routes";

export const handler = createLambdaHandler((app) => {
  app.register(prismaPlugin, { databaseUrl: gamesConfig.DATABASE_URL });
  app.register(gamesRoutes, { prefix: "/api" });
});
