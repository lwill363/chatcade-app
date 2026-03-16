import { FastifyInstance } from "fastify";
import * as MessagesController from "@features/messages/messages-controller";
import {
  ChannelIdParamsSchema,
  ChannelMessageParamsSchema,
  SendMessageSchema,
  EditMessageSchema,
  ListMessagesQuerySchema,
} from "@features/messages/messages-types";
import { authenticate } from "@common/middleware/authenticate";

export async function messagesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/channels/:channelId/messages",
    { schema: { params: ChannelIdParamsSchema, querystring: ListMessagesQuerySchema } },
    MessagesController.listMessages
  );

  app.post(
    "/channels/:channelId/messages",
    { schema: { params: ChannelIdParamsSchema, body: SendMessageSchema } },
    MessagesController.sendMessage
  );

  app.patch(
    "/channels/:channelId/messages/:messageId",
    { schema: { params: ChannelMessageParamsSchema, body: EditMessageSchema } },
    MessagesController.editMessage
  );

  app.delete(
    "/channels/:channelId/messages/:messageId",
    { schema: { params: ChannelMessageParamsSchema } },
    MessagesController.deleteMessage
  );
}
