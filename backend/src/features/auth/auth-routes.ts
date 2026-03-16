import { FastifyInstance } from "fastify";
import * as AuthController from "@features/auth/auth-controller";
import {
  LoginSchema,
  RegisterSchema,
  RefreshSchema,
} from "@features/auth/auth-types";
import { authenticate } from "@common/middleware/authenticate";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/register",
    { schema: { body: RegisterSchema } },
    AuthController.register
  );

  app.post(
    "/login",
    { schema: { body: LoginSchema } },
    AuthController.login
  );

  app.post(
    "/refresh",
    { schema: { body: RefreshSchema } },
    AuthController.refresh
  );

  app.post(
    "/logout",
    { schema: { body: RefreshSchema } },
    AuthController.logout
  );

  app.get("/me", { preHandler: authenticate }, AuthController.me);
}
