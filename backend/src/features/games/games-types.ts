import * as z from "zod";

export const GameIdParamsSchema = z.object({
  gameId: z.uuid(),
});
export type GameIdParamsDTO = z.infer<typeof GameIdParamsSchema>;

export const ChannelIdParamsSchema = z.object({
  channelId: z.uuid(),
});
export type ChannelIdParamsDTO = z.infer<typeof ChannelIdParamsSchema>;

const difficultyEnum = z.enum(["EASY", "MEDIUM", "HARD"]);

export const CreateGameSchema = z.object({
  vsBot: z.boolean().default(false),
  difficulty: difficultyEnum.default("HARD"),
});
export type CreateGameDTO = z.infer<typeof CreateGameSchema>;

export const CreateSoloGameSchema = z.object({
  difficulty: difficultyEnum.default("HARD"),
});
export type CreateSoloGameDTO = z.infer<typeof CreateSoloGameSchema>;

// Generic move payload — each game engine validates its own move structure
export const MakeMoveSchema = z.object({
  move: z.record(z.string(), z.unknown()),
});
export type MakeMoveDTO = z.infer<typeof MakeMoveSchema>;
