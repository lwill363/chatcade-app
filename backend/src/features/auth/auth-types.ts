import * as z from "zod";

export const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username may only contain letters, numbers, underscores, and hyphens"
    ),
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshDTO = z.infer<typeof RefreshSchema>;
