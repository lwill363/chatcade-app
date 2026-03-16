import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "generated/prisma/client";
import * as AuthRepository from "@features/auth/auth-repository";
import {
  APIError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "@common/errors";
import { RegisterDTO } from "@features/auth/auth-types";

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

export async function register(
  data: RegisterDTO,
  prisma: PrismaClient
) {
  const existing = await AuthRepository.findConflicting(prisma, data.email, data.username);

  if (existing) {
    throw new ConflictError("Email or username is already in use");
  }

  const defaultRole = await AuthRepository.findRoleByName(prisma, "user");

  if (!defaultRole) {
    throw new APIError({
      name: "SETUP_ERROR",
      message: "Default role not configured",
      code: 500,
    });
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await AuthRepository.createUser(prisma, {
    emailAddress: data.email,
    username: data.username,
    passwordHash,
    roleId: defaultRole.id,
  });

  return {
    id: user.id,
    username: user.username,
    email: user.emailAddress,
    role: user.role.name,
    createdAt: user.createdAt,
  };
}

export async function login(
  identifier: string,
  password: string,
  prisma: PrismaClient,
  jwtSecret: string
) {
  const isEmail = identifier.includes("@");
  const user = isEmail
    ? await AuthRepository.findByEmail(prisma, identifier)
    : await AuthRepository.findByUsername(prisma, identifier);

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const payload = { sub: user.id, email: user.emailAddress, role: user.role.name };
  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: REFRESH_TOKEN_TTL });

  await AuthRepository.createRefreshToken(prisma, user.id, refreshToken, new Date(Date.now() + REFRESH_TOKEN_MS));

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.emailAddress,
      role: user.role.name,
    },
  };
}

export async function refresh(
  refreshTokenValue: string,
  prisma: PrismaClient,
  jwtSecret: string
) {
  try {
    jwt.verify(refreshTokenValue, jwtSecret);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const stored = await AuthRepository.findRefreshToken(prisma, refreshTokenValue);

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await AuthRepository.deleteRefreshToken(prisma, stored.id);
    }
    throw new UnauthorizedError("Refresh token is invalid or has expired");
  }

  await AuthRepository.deleteRefreshToken(prisma, stored.id);

  const payload = {
    sub: stored.user.id,
    email: stored.user.emailAddress,
    role: stored.user.role.name,
  };
  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
  const newRefreshToken = jwt.sign({ sub: stored.user.id }, jwtSecret, { expiresIn: REFRESH_TOKEN_TTL });

  await AuthRepository.createRefreshToken(prisma, stored.user.id, newRefreshToken, new Date(Date.now() + REFRESH_TOKEN_MS));

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(
  refreshTokenValue: string,
  prisma: PrismaClient,
  jwtSecret: string
) {
  try {
    jwt.verify(refreshTokenValue, jwtSecret);
  } catch {
    // Accept expired tokens for logout so clients can always sign out
  }

  await AuthRepository.deleteRefreshTokenByValue(prisma, refreshTokenValue);
}

export async function getMe(userId: string, prisma: PrismaClient) {
  const user = await AuthRepository.findById(prisma, userId);

  if (!user) throw new NotFoundError("User");

  return {
    id: user.id,
    username: user.username,
    email: user.emailAddress,
    role: user.role.name,
    createdAt: user.createdAt,
  };
}
