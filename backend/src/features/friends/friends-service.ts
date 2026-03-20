import { PrismaClient } from "generated/prisma/client";
import * as FriendsRepository from "@features/friends/friends-repository";
import { ForbiddenError, NotFoundError } from "@common/errors";
import { broadcastToUsers } from "@common/broadcast/broadcast-service";
import { friendsConfig } from "@features/friends/friends-config";

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string,
  prisma: PrismaClient
) {
  if (requesterId === addresseeId) {
    throw new ForbiddenError("You cannot send a friend request to yourself");
  }
  const result = await FriendsRepository.sendFriendRequest(prisma, requesterId, addresseeId);
  void broadcastToUsers(prisma, friendsConfig.WS_CALLBACK_URL, [addresseeId], {
    type: "friend_request.created",
  });
  return result;
}

export async function listFriends(userId: string, prisma: PrismaClient) {
  return FriendsRepository.listFriends(prisma, userId);
}

export async function listIncomingRequests(userId: string, prisma: PrismaClient) {
  return FriendsRepository.listIncomingRequests(prisma, userId);
}

export async function listOutgoingRequests(userId: string, prisma: PrismaClient) {
  return FriendsRepository.listOutgoingRequests(prisma, userId);
}

export async function respondToRequest(
  addresseeId: string,
  requesterId: string,
  action: "accept" | "decline",
  prisma: PrismaClient
) {
  const result = await FriendsRepository.respondToRequest(prisma, requesterId, addresseeId, action);
  if (result === null && action === "accept") {
    throw new NotFoundError("Friend request");
  }
  void broadcastToUsers(prisma, friendsConfig.WS_CALLBACK_URL, [requesterId], {
    type: "friend_request.responded",
    action,
  });
  return result;
}

export async function removeFriend(userId: string, friendId: string, prisma: PrismaClient) {
  await FriendsRepository.removeFriend(prisma, userId, friendId);
}
