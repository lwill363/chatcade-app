import { FastifyInstance } from "fastify";
import * as ChannelsController from "@features/channels/channels-controller";
import {
  ChannelIdParamsSchema,
  MemberParamsSchema,
  UserIdParamsSchema,
  InviteIdParamsSchema,
  CreateRoomSchema,
  UpdateRoomSchema,
  SendInviteSchema,
} from "@features/channels/channels-types";
import { authenticate } from "@common/middleware/authenticate";

export async function channelsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/channels", ChannelsController.listChannels);

  app.post(
    "/channels/rooms",
    { schema: { body: CreateRoomSchema } },
    ChannelsController.createRoom
  );

  app.post(
    "/channels/dm/:userId",
    { schema: { params: UserIdParamsSchema } },
    ChannelsController.getOrCreateDirectChannel
  );

  // Invite inbox — must be before /channels/:channelId
  app.get("/channels/invites", ChannelsController.listMyInvites);

  app.post(
    "/channels/invites/:inviteId/accept",
    { schema: { params: InviteIdParamsSchema } },
    ChannelsController.acceptInvite
  );

  app.post(
    "/channels/invites/:inviteId/decline",
    { schema: { params: InviteIdParamsSchema } },
    ChannelsController.declineInvite
  );

  app.get(
    "/channels/:channelId",
    { schema: { params: ChannelIdParamsSchema } },
    ChannelsController.getChannel
  );

  app.patch(
    "/channels/:channelId",
    { schema: { params: ChannelIdParamsSchema, body: UpdateRoomSchema } },
    ChannelsController.updateRoom
  );

  app.delete(
    "/channels/:channelId",
    { schema: { params: ChannelIdParamsSchema } },
    ChannelsController.deleteRoom
  );

  app.post(
    "/channels/:channelId/join",
    { schema: { params: ChannelIdParamsSchema } },
    ChannelsController.joinRoom
  );

  app.delete(
    "/channels/:channelId/leave",
    { schema: { params: ChannelIdParamsSchema } },
    ChannelsController.leaveRoom
  );

  app.get(
    "/channels/:channelId/members",
    { schema: { params: ChannelIdParamsSchema } },
    ChannelsController.listMembers
  );

  app.delete(
    "/channels/:channelId/members/:userId",
    { schema: { params: MemberParamsSchema } },
    ChannelsController.kickMember
  );

  app.post(
    "/channels/:channelId/invites",
    { schema: { params: ChannelIdParamsSchema, body: SendInviteSchema } },
    ChannelsController.sendInvite
  );

  app.put(
    "/channels/:channelId/read",
    { schema: { params: ChannelIdParamsSchema } },
    ChannelsController.markRead
  );
}
