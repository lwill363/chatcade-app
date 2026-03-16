import { FastifyRequest, FastifyReply } from "fastify";
import * as MessagesService from "@features/messages/messages-service";
import {
  ChannelIdParamsDTO,
  ChannelMessageParamsDTO,
  SendMessageDTO,
  EditMessageDTO,
  ListMessagesQueryDTO,
} from "@features/messages/messages-types";

export async function sendMessage(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO; Body: SendMessageDTO }>,
  reply: FastifyReply
) {
  const result = await MessagesService.sendMessage(
    request.params.channelId,
    request.user!.principalId,
    request.body.content,
    request.server.prisma
  );
  return reply.code(201).send(result);
}

export async function listMessages(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO; Querystring: ListMessagesQueryDTO }>,
  reply: FastifyReply
) {
  const result = await MessagesService.listMessages(
    request.params.channelId,
    request.user!.principalId,
    request.query,
    request.server.prisma
  );
  return reply.send(result);
}

export async function editMessage(
  request: FastifyRequest<{ Params: ChannelMessageParamsDTO; Body: EditMessageDTO }>,
  reply: FastifyReply
) {
  const result = await MessagesService.editMessage(
    request.params.messageId,
    request.user!.principalId,
    request.body.content,
    request.server.prisma
  );
  return reply.send(result);
}

export async function deleteMessage(
  request: FastifyRequest<{ Params: ChannelMessageParamsDTO }>,
  reply: FastifyReply
) {
  await MessagesService.deleteMessage(
    request.params.messageId,
    request.user!.principalId,
    request.server.prisma
  );
  return reply.code(204).send();
}
