import { FastifyInstance } from "fastify";
import * as UsersController from "@features/users/users-controller";
import { UpdateProfileSchema, UserIdParamsSchema, SearchUsersQuerySchema, PresenceQuerySchema } from "@features/users/users-types";
import { authenticate } from "@common/middleware/authenticate";

export async function usersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/me", UsersController.getMe);

  app.patch(
    "/me",
    { schema: { body: UpdateProfileSchema } },
    UsersController.updateMe
  );

  app.delete("/me", UsersController.deleteMe);

  app.get(
    "/presence",
    { schema: { querystring: PresenceQuerySchema } },
    UsersController.getPresenceHandler
  );

  app.get(
    "/search",
    { schema: { querystring: SearchUsersQuerySchema } },
    UsersController.searchUsers
  );

  app.get(
    "/:userId",
    { schema: { params: UserIdParamsSchema } },
    UsersController.getUserById
  );
}
