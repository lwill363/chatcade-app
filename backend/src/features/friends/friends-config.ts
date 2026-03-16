import { baseConfigSchema } from "@common/config/config";
import * as z from "zod";

const friendsConfigSchema = baseConfigSchema.extend({
  FRIENDS_PORT: z.coerce.number(),
  FRIENDS_SERVICE_NAME: z.literal("friends"),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
});

export const friendsConfig = friendsConfigSchema.parse(process.env);
