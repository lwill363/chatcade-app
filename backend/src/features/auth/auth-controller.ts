import { FastifyRequest, FastifyReply } from "fastify";
import * as AuthService from "@features/auth/auth-service";
import { LoginDTO, RegisterDTO, RefreshDTO } from "@features/auth/auth-types";
import { authConfig } from "@features/auth/auth-config";

export async function register(
  request: FastifyRequest<{ Body: RegisterDTO }>,
  reply: FastifyReply
) {
  const result = await AuthService.register(request.body, request.server.prisma);
  return reply.code(201).send(result);
}

export async function login(
  request: FastifyRequest<{ Body: LoginDTO }>,
  reply: FastifyReply
) {
  const { email, password } = request.body;
  const result = await AuthService.login(email, password, request.server.prisma, authConfig.JWT_SECRET);
  return reply.send(result);
}

export async function refresh(
  request: FastifyRequest<{ Body: RefreshDTO }>,
  reply: FastifyReply
) {
  const result = await AuthService.refresh(request.body.refreshToken, request.server.prisma, authConfig.JWT_SECRET);
  return reply.send(result);
}

export async function logout(
  request: FastifyRequest<{ Body: RefreshDTO }>,
  reply: FastifyReply
) {
  await AuthService.logout(request.body.refreshToken, request.server.prisma, authConfig.JWT_SECRET);
  return reply.code(204).send();
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const result = await AuthService.getMe(request.user!.principalId, request.server.prisma);
  return reply.send(result);
}
