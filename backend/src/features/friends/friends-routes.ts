import { FastifyInstance } from "fastify";
import * as FriendsController from "@features/friends/friends-controller";
import {
  SendFriendRequestSchema,
  RespondToRequestSchema,
  RequesterIdParamsSchema,
  FriendIdParamsSchema,
} from "@features/friends/friends-types";
import { authenticate } from "@common/middleware/authenticate";

export async function friendsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post(
    "/friends/requests",
    { schema: { body: SendFriendRequestSchema } },
    FriendsController.sendFriendRequest
  );

  app.get("/friends", FriendsController.listFriends);

  app.get("/friends/requests/incoming", FriendsController.listIncomingRequests);

  app.get("/friends/requests/outgoing", FriendsController.listOutgoingRequests);

  app.patch(
    "/friends/requests/:requesterId",
    { schema: { params: RequesterIdParamsSchema, body: RespondToRequestSchema } },
    FriendsController.respondToRequest
  );

  app.delete(
    "/friends/:friendId",
    { schema: { params: FriendIdParamsSchema } },
    FriendsController.removeFriend
  );
}
