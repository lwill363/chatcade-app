import { baseConfigSchema } from "@common/config/config";
import * as z from "zod";

const gamesConfigSchema = baseConfigSchema.extend({
  GAMES_PORT: z.coerce.number(),
  GAMES_SERVICE_NAME: z.literal("games"),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  WS_CALLBACK_URL: z.url(),
});

export const gamesConfig = gamesConfigSchema.parse(process.env);
