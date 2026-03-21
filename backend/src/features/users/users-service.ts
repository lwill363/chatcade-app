import { PrismaClient } from "generated/prisma/client";
import * as UsersRepository from "@features/users/users-repository";
import { ConflictError, NotFoundError } from "@common/errors";
import { UpdateProfileDTO } from "@features/users/users-types";

function formatUser(user: {
  id: string;
  username: string;
  emailAddress: string;
  role: { name: string };
  profile: { displayName: string | null; bio: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.emailAddress,
    role: user.role.name,
    displayName: user.profile?.displayName ?? null,
    bio: user.profile?.bio ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getProfile(userId: string, prisma: PrismaClient) {
  const user = await UsersRepository.findById(prisma, userId);
  if (!user) throw new NotFoundError("User");
  return formatUser(user);
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileDTO,
  prisma: PrismaClient
) {
  if (data.username) {
    const existing = await UsersRepository.findByUsernameExcluding(prisma, data.username, userId);
    if (existing) throw new ConflictError("Username is already taken");
    await UsersRepository.update(prisma, userId, { username: data.username });
  }

  if (data.displayName !== undefined || data.bio !== undefined) {
    await UsersRepository.upsertProfile(prisma, userId, {
      displayName: data.displayName,
      bio: data.bio,
    });
  }

  const user = await UsersRepository.findById(prisma, userId);
  if (!user) throw new NotFoundError("User");
  return formatUser(user);
}

export async function searchUsers(query: string, requesterId: string, prisma: PrismaClient) {
  return UsersRepository.searchByUsername(prisma, query, requesterId);
}

export async function getUserById(userId: string, prisma: PrismaClient) {
  const user = await UsersRepository.findPublicById(prisma, userId);
  if (!user) throw new NotFoundError("User");
  return {
    id: user.id,
    username: user.username,
    role: user.role.name,
    displayName: user.profile?.displayName ?? null,
    bio: user.profile?.bio ?? null,
    createdAt: user.createdAt,
  };
}

export async function deleteAccount(userId: string, prisma: PrismaClient) {
  // Handle owned rooms: transfer ownership or delete if empty
  const ownedRooms = await prisma.channel.findMany({
    where: { ownerId: userId, type: "ROOM" },
    include: {
      members: {
        where: { userId: { not: userId } },
        orderBy: { joinedAt: "asc" },
        take: 1,
      },
    },
  });

  for (const room of ownedRooms) {
    if (room.members.length > 0) {
      await prisma.channel.update({
        where: { id: room.id },
        data: { ownerId: room.members[0].userId },
      });
    } else {
      await prisma.channel.delete({ where: { id: room.id } });
    }
  }

  // Delete the user — cascades to memberships, refresh tokens, WS connections, friendships
  // Messages retain their content with authorId set to NULL via FK SET NULL
  await prisma.user.delete({ where: { id: userId } });
}

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;   // 2 minutes
const AWAY_THRESHOLD_MS = 15 * 60 * 1000;    // 15 minutes

export async function getPresence(userIds: string[], prisma: PrismaClient) {
  const rows = await UsersRepository.getPresence(prisma, userIds);
  const now = Date.now();
  return rows.map((row) => {
    const msSinceSeen = row.lastSeenAt ? now - row.lastSeenAt.getTime() : Infinity;
    const isOnline = msSinceSeen <= ONLINE_THRESHOLD_MS;
    const isAway = !isOnline && msSinceSeen <= AWAY_THRESHOLD_MS;
    return { userId: row.id, isOnline, isAway };
  });
}
