import prismaPlugin from "@common/plugins/prisma-plugin";
import { createLambdaHandler } from "@common/utils/create-lambda-handler";
import { usersConfig } from "@features/users/users-config";
import { usersRoutes } from "@features/users/users-routes";

export const handler = createLambdaHandler((app) => {
  app.register(prismaPlugin, { databaseUrl: usersConfig.DATABASE_URL });
  app.register(usersRoutes, { prefix: "/api/users" });
});
