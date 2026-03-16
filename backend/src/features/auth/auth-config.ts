import { baseConfigSchema } from "@common/config/config";
import * as z from "zod";

const authConfigSchema = baseConfigSchema.extend({
  AUTH_PORT: z.coerce.number(),
  AUTH_SERVICE_NAME: z.literal("auth"),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
});

export const authConfig = authConfigSchema.parse(process.env);
