import { FastifyRequest, FastifyReply } from "fastify";
import * as GamesService from "@features/games/games-service";
import {
  ChannelIdParamsDTO,
  GameIdParamsDTO,
  CreateGameDTO,
  CreateSoloGameDTO,
  MakeMoveDTO,
} from "@features/games/games-types";

export async function getActiveGame(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO }>,
  reply: FastifyReply
) {
  const result = await GamesService.getActiveGame(
    request.params.channelId,
    request.user!.principalId,
    request.server.prisma
  );
  return reply.send(result ?? null);
}

export async function createGame(
  request: FastifyRequest<{ Params: ChannelIdParamsDTO; Body: CreateGameDTO }>,
  reply: FastifyReply
) {
  const result = await GamesService.createGame(
    request.params.channelId,
    request.user!.principalId,
    request.body,
    request.server.prisma
  );
  return reply.code(201).send(result);
}

export async function joinGame(
  request: FastifyRequest<{ Params: GameIdParamsDTO }>,
  reply: FastifyReply
) {
  const result = await GamesService.joinGame(
    request.params.gameId,
    request.user!.principalId,
    request.server.prisma
  );
  return reply.send(result);
}

export async function makeMove(
  request: FastifyRequest<{ Params: GameIdParamsDTO; Body: MakeMoveDTO }>,
  reply: FastifyReply
) {
  const result = await GamesService.makeMove(
    request.params.gameId,
    request.user!.principalId,
    request.body.move,
    request.server.prisma
  );
  return reply.send(result);
}

export async function forfeitGame(
  request: FastifyRequest<{ Params: GameIdParamsDTO }>,
  reply: FastifyReply
) {
  const result = await GamesService.forfeitGame(
    request.params.gameId,
    request.user!.principalId,
    request.server.prisma
  );
  return reply.send(result);
}

export async function getActiveChannelGames(request: FastifyRequest, reply: FastifyReply) {
  const result = await GamesService.getActiveChannelGames(
    request.user!.principalId,
    request.server.prisma
  );
  return reply.send(result);
}

export async function getActiveSoloGame(request: FastifyRequest, reply: FastifyReply) {
  const result = await GamesService.getActiveSoloGame(
    request.user!.principalId,
    request.server.prisma
  );
  return reply.send(result ?? null);
}

export async function createSoloGame(
  request: FastifyRequest<{ Body: CreateSoloGameDTO }>,
  reply: FastifyReply
) {
  const result = await GamesService.createSoloGame(
    request.user!.principalId,
    request.body,
    request.server.prisma
  );
  return reply.code(201).send(result);
}
