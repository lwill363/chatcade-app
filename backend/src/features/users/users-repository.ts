import { PrismaClient } from "generated/prisma/client";

const PROFILE_SELECT = {
  displayName: true,
  bio: true,
} as const;

const FULL_PROFILE_SELECT = {
  id: true,
  username: true,
  emailAddress: true,
  role: { select: { name: true } },
  profile: { select: PROFILE_SELECT },
  createdAt: true,
  updatedAt: true,
} as const;

export function findById(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: FULL_PROFILE_SELECT,
  });
}

export function findPublicById(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      role: { select: { name: true } },
      profile: { select: PROFILE_SELECT },
      createdAt: true,
    },
  });
}

export function findByUsernameExcluding(prisma: PrismaClient, username: string, excludeId: string) {
  return prisma.user.findFirst({
    where: { username, NOT: { id: excludeId } },
    select: { id: true },
  });
}

export function searchByUsername(prisma: PrismaClient, query: string, excludeId: string) {
  return prisma.user.findMany({
    where: {
      username: { contains: query, mode: "insensitive" },
      NOT: { id: excludeId },
    },
    select: { id: true, username: true, profile: { select: PROFILE_SELECT } },
    orderBy: { username: "asc" },
    take: 10,
  });
}

export function update(prisma: PrismaClient, id: string, data: { username?: string }) {
  return prisma.user.update({
    where: { id },
    data,
    select: FULL_PROFILE_SELECT,
  });
}

export function upsertProfile(
  prisma: PrismaClient,
  userId: string,
  data: { displayName?: string | null; bio?: string | null }
) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export function updateLastSeen(prisma: PrismaClient, userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
  });
}

export function getPresence(prisma: PrismaClient, userIds: string[]) {
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, lastSeenAt: true },
  });
}
