import prismaPlugin from "@common/plugins/prisma-plugin";
import { createLambdaHandler } from "@common/utils/create-lambda-handler";
import { authConfig } from "@features/auth/auth-config";
import { authRoutes } from "@features/auth/auth-routes";

export const handler = createLambdaHandler((app) => {
  // Register Prisma plugin once
  app.register(prismaPlugin, { databaseUrl: authConfig.DATABASE_URL });
  app.register(authRoutes, { prefix: "/api/auth" });
});
