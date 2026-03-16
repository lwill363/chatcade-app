import * as z from "zod";

export const baseConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
});
