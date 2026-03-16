import { PrismaClient } from "generated/prisma/client";

export function findConflicting(prisma: PrismaClient, email: string, username: string) {
  return prisma.user.findFirst({
    where: { OR: [{ emailAddress: email }, { username }] },
    select: { id: true },
  });
}

export function findRoleByName(prisma: PrismaClient, name: string) {
  return prisma.role.findFirst({
    where: { name },
    select: { id: true, name: true },
  });
}

export function createUser(
  prisma: PrismaClient,
  data: { emailAddress: string; username: string; passwordHash: string; roleId: string }
) {
  return prisma.user.create({
    data,
    select: {
      id: true,
      username: true,
      emailAddress: true,
      role: { select: { name: true } },
      createdAt: true,
    },
  });
}

export function findByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({
    where: { emailAddress: email },
    select: {
      id: true,
      username: true,
      emailAddress: true,
      passwordHash: true,
      role: { select: { name: true } },
    },
  });
}

export function findByUsername(prisma: PrismaClient, username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      emailAddress: true,
      passwordHash: true,
      role: { select: { name: true } },
    },
  });
}

export function findById(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      emailAddress: true,
      role: { select: { name: true } },
      createdAt: true,
    },
  });
}

export function createRefreshToken(prisma: PrismaClient, userId: string, token: string, expiresAt: Date) {
  return prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
}

export function findRefreshToken(prisma: PrismaClient, token: string) {
  return prisma.refreshToken.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          username: true,
          emailAddress: true,
          role: { select: { name: true } },
        },
      },
    },
  });
}

export function deleteRefreshToken(prisma: PrismaClient, id: string) {
  return prisma.refreshToken.delete({ where: { id } });
}

export function deleteRefreshTokenByValue(prisma: PrismaClient, token: string) {
  return prisma.refreshToken.deleteMany({ where: { token } });
}
