import { PrismaClient } from "generated/prisma/client";
import { ConflictError } from "@common/errors";

const friendUserSelect = {
  id: true,
  username: true,
  profile: { select: { displayName: true } },
} as const;

export async function sendFriendRequest(
  prisma: PrismaClient,
  requesterId: string,
  addresseeId: string
) {
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    throw new ConflictError("A friendship or request already exists between these users");
  }

  return prisma.friendship.create({
    data: { requesterId, addresseeId },
    select: { id: true, requesterId: true, addresseeId: true, status: true, createdAt: true },
  });
}

export async function listFriends(prisma: PrismaClient, userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: {
      id: true,
      requester: { select: friendUserSelect },
      addressee: { select: friendUserSelect },
    },
  });

  return friendships.map((f) => {
    const friend = f.requester.id === userId ? f.addressee : f.requester;
    return {
      friendshipId: f.id,
      userId: friend.id,
      username: friend.username,
      displayName: friend.profile?.displayName ?? null,
    };
  });
}

export async function listIncomingRequests(prisma: PrismaClient, userId: string) {
  const requests = await prisma.friendship.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    select: {
      id: true,
      createdAt: true,
      requester: { select: friendUserSelect },
    },
  });

  return requests.map((r) => ({
    friendshipId: r.id,
    userId: r.requester.id,
    username: r.requester.username,
    displayName: r.requester.profile?.displayName ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listOutgoingRequests(prisma: PrismaClient, userId: string) {
  const requests = await prisma.friendship.findMany({
    where: { requesterId: userId, status: "PENDING" },
    select: {
      id: true,
      createdAt: true,
      addressee: { select: friendUserSelect },
    },
  });

  return requests.map((r) => ({
    friendshipId: r.id,
    userId: r.addressee.id,
    username: r.addressee.username,
    displayName: r.addressee.profile?.displayName ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function respondToRequest(
  prisma: PrismaClient,
  requesterId: string,
  addresseeId: string,
  action: "accept" | "decline"
) {
  const friendship = await prisma.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId, addresseeId } },
  });

  if (!friendship || friendship.status !== "PENDING") {
    return null;
  }

  if (action === "accept") {
    return prisma.friendship.update({
      where: { requesterId_addresseeId: { requesterId, addresseeId } },
      data: { status: "ACCEPTED" },
      select: { id: true, status: true },
    });
  } else {
    await prisma.friendship.delete({
      where: { requesterId_addresseeId: { requesterId, addresseeId } },
    });
    return null;
  }
}

export async function removeFriend(
  prisma: PrismaClient,
  userId: string,
  friendId: string
) {
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: userId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: userId },
      ],
    },
  });
}
