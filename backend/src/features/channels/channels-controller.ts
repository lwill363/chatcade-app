import { FastifyRequest, FastifyReply } from "fastify";
import * as ChannelsService from "@features/channels/channels-service";
import {
  ChannelIdParamsDTO,
  MemberParamsDTO,
  UserIdParamsDTO,
  InviteIdParamsDTO,
  CreateRoomDTO,
  UpdateRoomDTO,
  SendInviteDTO,
} from "@features/channels/channels-types";

export async function listChannels(request: FastifyRequest, reply: FastifyReply) {
  const result = await ChannelsService.listChannels(request.user!.principalId, request.server.prisma);
  return reply.send(result);
}

export async function createRoom(
  request: FastifyRequest<{ Body: CreateRoomDTO }>,
  reply: FastifyReply
) {
  const result = await ChannelsService.createRoom(request.user!.principalId, request.body, request.server.prisma);
  return reply.code(201).send(result);
}

export async function getChannel(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO }>,
  reply: FastifyReply
) {
  const result = await ChannelsService.getChannel(request.params.channelId, request.user!.principalId, request.server.prisma);
  return reply.send(result);
}

export async function updateRoom(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO; Body: UpdateRoomDTO }>,
  reply: FastifyReply
) {
  const result = await ChannelsService.updateRoom(request.params.channelId, request.user!.principalId, request.body, request.server.prisma);
  return reply.send(result);
}

export async function deleteRoom(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO }>,
  reply: FastifyReply
) {
  await ChannelsService.deleteRoom(request.params.channelId, request.user!.principalId, request.server.prisma);
  return reply.code(204).send();
}

export async function joinRoom(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO }>,
  reply: FastifyReply
) {
  const result = await ChannelsService.joinRoom(request.params.channelId, request.user!.principalId, request.server.prisma);
  return reply.send(result);
}

export async function leaveRoom(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO }>,
  reply: FastifyReply
) {
  await ChannelsService.leaveRoom(request.params.channelId, request.user!.principalId, request.server.prisma);
  return reply.code(204).send();
}

export async function listMembers(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO }>,
  reply: FastifyReply
) {
  const result = await ChannelsService.listMembers(request.params.channelId, request.user!.principalId, request.server.prisma);
  return reply.send(result);
}

export async function kickMember(
  request: FastifyRequest<{ Params: MemberParamsDTO }>,
  reply: FastifyReply
) {
  await ChannelsService.kickMember(request.params.channelId, request.user!.principalId, request.params.userId, request.server.prisma);
  return reply.code(204).send();
}

export async function getOrCreateDirectChannel(
  request: FastifyRequest<{ Params: UserIdParamsDTO }>,
  reply: FastifyReply
) {
  const result = await ChannelsService.getOrCreateDirectChannel(request.user!.principalId, request.params.userId, request.server.prisma);
  return reply.code(200).send(result);
}

export async function sendInvite(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO; Body: SendInviteDTO }>,
  reply: FastifyReply
) {
  await ChannelsService.sendInvite(
    request.params.channelId,
    request.user!.principalId,
    request.body.userId,
    request.server.prisma,
  );
  return reply.code(204).send();
}

export async function listMyInvites(request: FastifyRequest, reply: FastifyReply) {
  const result = await ChannelsService.listMyInvites(request.user!.principalId, request.server.prisma);
  return reply.send(result);
}

export async function acceptInvite(
  request: FastifyRequest<{ Params: InviteIdParamsDTO }>,
  reply: FastifyReply
) {
  await ChannelsService.acceptInvite(request.params.inviteId, request.user!.principalId, request.server.prisma);
  return reply.code(204).send();
}

export async function declineInvite(
  request: FastifyRequest<{ Params: InviteIdParamsDTO }>,
  reply: FastifyReply
) {
  await ChannelsService.declineInvite(request.params.inviteId, request.user!.principalId, request.server.prisma);
  return reply.code(204).send();
}

export async function markRead(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO }>,
  reply: FastifyReply
) {
  await ChannelsService.markRead(request.params.channelId, request.user!.principalId, request.server.prisma);
  return reply.code(204).send();
}
