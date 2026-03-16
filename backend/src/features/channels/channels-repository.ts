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

export function findMembership(prisma: PrismaClient, channelId: string, userId: string) {
  return prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { channelId: true },
  });
}

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

export function markRead(prisma: PrismaClient, channelId: string, userId: string) {
  return prisma.channelMember.update({
    where: { channelId_userId: { channelId, userId } },
    data: { lastReadAt: new Date() },
  });
}

// ── Channel list ──────────────────────────────────────────────────────────────

export async function listChannelsForUser(prisma: PrismaClient, userId: string) {
  const memberships = await prisma.channelMember.findMany({
    where: { userId },
    select: {
      lastReadAt: true,
      channel: {
        select: {
          id: true,
          type: true,
          name: true,
          description: true,
          ownerId: true,
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

  const withUnread = await Promise.all(
    memberships.map(async (m) => {
      const unreadCount = await prisma.message.count({
        where: {
          channelId: m.channel.id,
          createdAt: { gt: m.lastReadAt },
          NOT: { authorId: userId },
        },
      });

      const latest = m.channel.lastMessage;
      const latestMessage = latest
        ? { content: latest.content, authorUsername: latest.author.username }
        : null;

      if (m.channel.type === "ROOM") {
        return {
          id: m.channel.id,
          type: "ROOM" as const,
          name: m.channel.name!,
          description: m.channel.description ?? null,
          ownerId: m.channel.ownerId!,
          unreadCount,
          latestAt: latest?.createdAt.toISOString() ?? null,
          latestMessage,
        };
      } else {
        const partner = m.channel.members[0]?.user;
        return {
          id: m.channel.id,
          type: "DM" as const,
          partnerId: partner?.id ?? "",
          partnerUsername: partner?.username ?? "",
          unreadCount,
          latestAt: latest?.createdAt.toISOString() ?? null,
          latestMessage,
        };
      }
    })
  );

  const sorted = withUnread.sort((a, b) => {
    if (!a.latestAt && !b.latestAt) return 0;
    if (!a.latestAt) return 1;
    if (!b.latestAt) return -1;
    return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
  });

  // Deduplicate DM channels per partner (keep the most recently active one)
  const seenPartners = new Set<string>();
  return sorted.filter((ch) => {
    if (ch.type !== "DM") return true;
    if (seenPartners.has(ch.partnerId)) return false;
    seenPartners.add(ch.partnerId);
    return true;
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
