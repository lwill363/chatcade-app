import { baseConfigSchema } from "@common/config/config";
import * as z from "zod";

const channelsConfigSchema = baseConfigSchema.extend({
  CHANNELS_PORT: z.coerce.number(),
  CHANNELS_SERVICE_NAME: z.literal("channels"),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
});

export const channelsConfig = channelsConfigSchema.parse(process.env);
