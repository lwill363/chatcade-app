import { FastifyRequest, FastifyReply } from "fastify";
import * as UsersService from "@features/users/users-service";
import { UpdateProfileDTO, UserIdParamsDTO, SearchUsersQueryDTO, PresenceQueryDTO } from "@features/users/users-types";

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const result = await UsersService.getProfile(request.user!.principalId, request.server.prisma);
  return reply.send(result);
}

export async function updateMe(
  request: FastifyRequest<{ Body: UpdateProfileDTO }>,
  reply: FastifyReply
) {
  const result = await UsersService.updateProfile(request.user!.principalId, request.body, request.server.prisma);
  return reply.send(result);
}

export async function getUserById(
  request: FastifyRequest<{ Params: UserIdParamsDTO }>,
  reply: FastifyReply
) {
  const result = await UsersService.getUserById(request.params.userId, request.server.prisma);
  return reply.send(result);
}

export async function searchUsers(
  request: FastifyRequest<{ Querystring: SearchUsersQueryDTO }>,
  reply: FastifyReply
) {
  const result = await UsersService.searchUsers(request.query.q, request.user!.principalId, request.server.prisma);
  return reply.send(result);
}

export async function heartbeatHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  await UsersService.heartbeat(request.user!.principalId, request.server.prisma);
  return reply.code(204).send();
}

export async function getPresenceHandler(
  request: FastifyRequest<{ Querystring: PresenceQueryDTO }>,
  reply: FastifyReply
) {
  const userIds = request.query.userIds.split(",").filter(Boolean);
  const result = await UsersService.getPresence(userIds, request.server.prisma);
  return reply.send(result);
}
