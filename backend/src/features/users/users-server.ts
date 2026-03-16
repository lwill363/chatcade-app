import "dotenv/config";
import prismaPlugin from "@common/plugins/prisma-plugin";
import { buildApp } from "@common/utils/build-app";
import { usersConfig } from "@features/users/users-config";
import { usersRoutes } from "@features/users/users-routes";

const start = async () => {
  const app = buildApp();

  app.register(prismaPlugin, { databaseUrl: usersConfig.DATABASE_URL });
  await app.register(usersRoutes, { prefix: "/api/users" });

  app.listen({ port: usersConfig.USERS_PORT }, (err) => {
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
