import "dotenv/config";
import prismaPlugin from "@common/plugins/prisma-plugin";
import { buildApp } from "@common/utils/build-app";
import { gamesConfig } from "@features/games/games-config";
import { gamesRoutes } from "@features/games/games-routes";

const start = async () => {
  const app = buildApp();

  app.register(prismaPlugin, { databaseUrl: gamesConfig.DATABASE_URL });
  await app.register(gamesRoutes, { prefix: "/api" });

  app.listen({ port: gamesConfig.GAMES_PORT }, (err) => {
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
