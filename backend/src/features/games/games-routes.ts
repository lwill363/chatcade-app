import { FastifyInstance } from "fastify";
import * as GamesController from "@features/games/games-controller";
import {
  ChannelIdParamsSchema,
  GameIdParamsSchema,
  CreateGameSchema,
  CreateSoloGameSchema,
  MakeMoveSchema,
} from "@features/games/games-types";
import { authenticate } from "@common/middleware/authenticate";

export async function gamesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // Solo game — must be before /games/channel/:channelId to avoid param capture
  app.get("/games/solo", GamesController.getActiveSoloGame);

  app.post(
    "/games/solo",
    { schema: { body: CreateSoloGameSchema } },
    GamesController.createSoloGame
  );

  // Channel game
  app.get(
    "/games/channel/:channelId",
    { schema: { params: ChannelIdParamsSchema } },
    GamesController.getActiveGame
  );

  app.post(
    "/games/channel/:channelId",
    { schema: { params: ChannelIdParamsSchema, body: CreateGameSchema } },
    GamesController.createGame
  );

  // Shared actions (work for both solo and channel games)
  app.post(
    "/games/:gameId/join",
    { schema: { params: GameIdParamsSchema } },
    GamesController.joinGame
  );

  app.post(
    "/games/:gameId/move",
    { schema: { params: GameIdParamsSchema, body: MakeMoveSchema } },
    GamesController.makeMove
  );

  app.post(
    "/games/:gameId/forfeit",
    { schema: { params: GameIdParamsSchema } },
    GamesController.forfeitGame
  );
}
