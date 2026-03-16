import { baseConfigSchema } from "@common/config/config";
import * as z from "zod";

const usersConfigSchema = baseConfigSchema.extend({
  USERS_PORT: z.coerce.number(),
  USERS_SERVICE_NAME: z.literal("users"),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
});

export const usersConfig = usersConfigSchema.parse(process.env);
