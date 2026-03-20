import { baseConfigSchema } from "@common/config/config";
import * as z from "zod";

export const wsConnectConfigSchema = baseConfigSchema.extend({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  WS_CALLBACK_URL: z.url(),
});

export const wsDefaultConfigSchema = wsConnectConfigSchema;

export const wsConnectConfig = wsConnectConfigSchema.parse(process.env);
export const wsDefaultConfig = wsConnectConfigSchema.parse(process.env);
