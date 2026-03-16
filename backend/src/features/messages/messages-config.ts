import { baseConfigSchema } from "@common/config/config";
import * as z from "zod";

const messagesConfigSchema = baseConfigSchema.extend({
  MESSAGES_PORT: z.coerce.number(),
  MESSAGES_SERVICE_NAME: z.literal("messages"),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
});

export const messagesConfig = messagesConfigSchema.parse(process.env);
