import "dotenv/config";
import prismaPlugin from "@common/plugins/prisma-plugin";
import { buildApp } from "@common/utils/build-app";
import { messagesConfig } from "@features/messages/messages-config";
import { messagesRoutes } from "@features/messages/messages-routes";

const start = async () => {
  const app = buildApp();

  app.register(prismaPlugin, { databaseUrl: messagesConfig.DATABASE_URL });
  await app.register(messagesRoutes, { prefix: "/api" });

  app.listen({ port: messagesConfig.MESSAGES_PORT }, (err) => {
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
