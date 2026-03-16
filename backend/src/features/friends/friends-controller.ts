import { FastifyRequest, FastifyReply } from "fastify";
import * as FriendsService from "@features/friends/friends-service";
import {
  SendFriendRequestDTO,
  RespondToRequestDTO,
  RequesterIdParamsDTO,
  FriendIdParamsDTO,
} from "@features/friends/friends-types";

export async function sendFriendRequest(
  request: FastifyRequest<{ Body: SendFriendRequestDTO }>,
  reply: FastifyReply
) {
  const result = await FriendsService.sendFriendRequest(
    request.user!.principalId,
    request.body.addresseeId,
    request.server.prisma
  );
  return reply.code(201).send(result);
}

export async function listFriends(request: FastifyRequest, reply: FastifyReply) {
  const result = await FriendsService.listFriends(
    request.user!.principalId,
    request.server.prisma
  );
  return reply.send(result);
}

export async function listIncomingRequests(request: FastifyRequest, reply: FastifyReply) {
  const result = await FriendsService.listIncomingRequests(
    request.user!.principalId,
    request.server.prisma
  );
  return reply.send(result);
}

export async function listOutgoingRequests(request: FastifyRequest, reply: FastifyReply) {
  const result = await FriendsService.listOutgoingRequests(
    request.user!.principalId,
    request.server.prisma
  );
  return reply.send(result);
}

export async function respondToRequest(
  request: FastifyRequest<{ Params: RequesterIdParamsDTO; Body: RespondToRequestDTO }>,
  reply: FastifyReply
) {
  await FriendsService.respondToRequest(
    request.user!.principalId,
    request.params.requesterId,
    request.body.action,
    request.server.prisma
  );
  return reply.code(204).send();
}

export async function removeFriend(
  request: FastifyRequest<{ Params: FriendIdParamsDTO }>,
  reply: FastifyReply
) {
  await FriendsService.removeFriend(
    request.user!.principalId,
    request.params.friendId,
    request.server.prisma
  );
  return reply.code(204).send();
}
