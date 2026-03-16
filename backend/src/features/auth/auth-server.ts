import "dotenv/config";
import prismaPlugin from "@common/plugins/prisma-plugin";
import { buildApp } from "@common/utils/build-app";
import { authConfig } from "@features/auth/auth-config";
import { authRoutes } from "@features/auth/auth-routes";

const start = async () => {
  const app = buildApp();

  // Register Prisma plugin once
  app.register(prismaPlugin, { databaseUrl: authConfig.DATABASE_URL });
  await app.register(authRoutes, { prefix: "/api/auth" });

  app.listen({ port: authConfig.AUTH_PORT }, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });

  const shutdown = async () => {
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
};

start();
