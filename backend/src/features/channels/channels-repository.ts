import { PrismaClient, ChannelInviteStatus } from "generated/prisma/client";
import { CreateRoomDTO, UpdateRoomDTO } from "@features/channels/channels-types";

// ── Room CRUD ─────────────────────────────────────────────────────────────────

export async function createRoom(
  prisma: PrismaClient,
  data: CreateRoomDTO & { ownerId: string }
) {
  return prisma.$transaction(async (tx) => {
    const channel = await tx.channel.create({
      data: { type: "ROOM", name: data.name, description: data.description, ownerId: data.ownerId },
      select: { id: true, type: true, name: true, description: true, ownerId: true, createdAt: true },
    });
    await tx.channelMember.create({ data: { channelId: channel.id, userId: data.ownerId } });
    if (data.inviteeIds && data.inviteeIds.length > 0) {
      const uniqueInvitees = [...new Set(data.inviteeIds.filter((id) => id !== data.ownerId))];
      await tx.channelInvite.createMany({
        data: uniqueInvitees.map((inviteeId) => ({
          channelId: channel.id,
          inviterId: data.ownerId,
          inviteeId,
        })),
        skipDuplicates: true,
      });
    }
    return channel;
  });
}

export function findChannelById(prisma: PrismaClient, channelId: string) {
  return prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      type: true,
      name: true,
      description: true,
      ownerId: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });
}

export function updateRoom(prisma: PrismaClient, channelId: string, data: UpdateRoomDTO) {
  return prisma.channel.update({
    where: { id: channelId },
    data,
    select: { id: true, type: true, name: true, description: true, ownerId: true, createdAt: true },
  });
}

export function deleteChannel(prisma: PrismaClient, channelId: string) {
  return prisma.channel.delete({ where: { id: channelId } });
}

// ── Membership ────────────────────────────────────────────────────────────────

export function createMembership(prisma: PrismaClient, channelId: string, userId: string) {
  return prisma.channelMember.create({ data: { channelId, userId } });
}

export function deleteMembership(prisma: PrismaClient, channelId: string, userId: string) {
  return prisma.channelMember.delete({
    where: { channelId_userId: { channelId, userId } },
  });
}

export function listMembers(prisma: PrismaClient, channelId: string) {
  return prisma.channelMember.findMany({
    where: { channelId },
    select: { joinedAt: true, user: { select: { id: true, username: true } } },
    orderBy: { joinedAt: "asc" },
  });
}

// ── DM channel ────────────────────────────────────────────────────────────────

export async function findOrCreateDirectChannel(
  prisma: PrismaClient,
  userAId: string,
  userBId: string
) {
  const existing = await prisma.channel.findFirst({
    where: {
      type: "DM",
      AND: [
        { members: { some: { userId: userAId } } },
        { members: { some: { userId: userBId } } },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    return { id: existing.id };
  }

  return prisma.$transaction(async (tx) => {
    const channel = await tx.channel.create({
      data: { type: "DM" },
      select: { id: true },
    });
    await tx.channelMember.createMany({
      data: [
        { channelId: channel.id, userId: userAId },
        { channelId: channel.id, userId: userBId },
      ],
    });
    return channel;
  });
}

// ── Read tracking ─────────────────────────────────────────────────────────────

// ── Channel list ──────────────────────────────────────────────────────────────

export function listChannelsForUser(prisma: PrismaClient, userId: string) {
  return prisma.channelMember.findMany({
    where: { userId },
    select: {
      lastReadMessage: { select: { createdAt: true } },
      channel: {
        select: {
          id: true,
          type: true,
          name: true,
          description: true,
          ownerId: true,
          lastMessageId: true,
          members: {
            where: { userId: { not: userId } },
            select: { user: { select: { id: true, username: true } } },
          },
          lastMessage: {
            select: {
              id: true,
              createdAt: true,
              content: true,
              author: { select: { username: true } },
            },
          },
        },
      },
    },
  });
}

// ── Invites ───────────────────────────────────────────────────────────────────

export function findPendingInvite(prisma: PrismaClient, channelId: string, inviteeId: string) {
  return prisma.channelInvite.findFirst({
    where: { channelId, inviteeId, status: "PENDING" },
    select: { id: true },
  });
}

export function createInvite(
  prisma: PrismaClient,
  channelId: string,
  inviterId: string,
  inviteeId: string
) {
  return prisma.channelInvite.create({
    data: { channelId, inviterId, inviteeId },
    select: { id: true },
  });
}

export function findInviteById(prisma: PrismaClient, inviteId: string) {
  return prisma.channelInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      channelId: true,
      inviteeId: true,
      status: true,
      channel: { select: { name: true, type: true } },
      inviter: { select: { id: true, username: true } },
    },
  });
}

export function updateInviteStatus(
  prisma: PrismaClient,
  inviteId: string,
  status: ChannelInviteStatus
) {
  return prisma.channelInvite.update({
    where: { id: inviteId },
    data: { status },
  });
}

export function listPendingInvitesForUser(prisma: PrismaClient, inviteeId: string) {
  return prisma.channelInvite.findMany({
    where: { inviteeId, status: "PENDING" },
    select: {
      id: true,
      channelId: true,
      status: true,
      createdAt: true,
      channel: { select: { name: true } },
      inviter: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
