import "fastify";
import { PrismaClient } from "generated/prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      principalId: string;
      email?: string;
      role?: string;
      [key: string]: any; // custom authorizer fields
    };
  }

  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
