import { baseConfigSchema } from "@common/config/config";
import * as z from "zod";

export const wsConnectConfigSchema = baseConfigSchema.extend({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
});

export const wsDefaultConfigSchema = wsConnectConfigSchema.extend({
  WS_CALLBACK_URL: z.url(),
});

export const wsConnectConfig = wsConnectConfigSchema.parse(process.env);
export const wsDefaultConfig = wsDefaultConfigSchema.parse(process.env);
