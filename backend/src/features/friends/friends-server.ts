import "dotenv/config";
import prismaPlugin from "@common/plugins/prisma-plugin";
import { buildApp } from "@common/utils/build-app";
import { friendsConfig } from "@features/friends/friends-config";
import { friendsRoutes } from "@features/friends/friends-routes";

const start = async () => {
  const app = buildApp();

  app.register(prismaPlugin, { databaseUrl: friendsConfig.DATABASE_URL });
  await app.register(friendsRoutes, { prefix: "/api" });

  app.listen({ port: friendsConfig.FRIENDS_PORT }, (err) => {
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
