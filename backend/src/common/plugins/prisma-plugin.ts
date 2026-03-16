import fp from "fastify-plugin";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "generated/prisma/client";

export type PrismaPluginOptions = {
  databaseUrl: string;
};

const prismaPlugin = fp<PrismaPluginOptions>(async (server, options) => {
  const adapter = new PrismaPg({
    connectionString: options.databaseUrl,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();

  // Make Prisma Client available through the fastify server instance: server.prisma
  server.decorate("prisma", prisma);

  server.addHook("onClose", async (server) => {
    await server.prisma.$disconnect();
  });
});

export default prismaPlugin;
