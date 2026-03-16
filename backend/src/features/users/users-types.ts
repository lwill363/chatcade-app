import * as z from "zod";

export const UserIdParamsSchema = z.object({
  userId: z.uuid(),
});

export type UserIdParamsDTO = z.infer<typeof UserIdParamsSchema>;

export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username may only contain letters, numbers, underscores, and hyphens"
    )
    .optional(),
  displayName: z.string().max(100, "Display name must be at most 100 characters").nullable().optional(),
  bio: z.string().max(500, "Bio must be at most 500 characters").nullable().optional(),
});

export type UpdateProfileDTO = z.infer<typeof UpdateProfileSchema>;

export const SearchUsersQuerySchema = z.object({
  q: z.string().min(1).max(50),
});

export type SearchUsersQueryDTO = z.infer<typeof SearchUsersQuerySchema>;

export const PresenceQuerySchema = z.object({
  userIds: z.string(),
});

export type PresenceQueryDTO = z.infer<typeof PresenceQuerySchema>;

export type PresenceDto = {
  userId: string;
  isOnline: boolean;
  isAway: boolean;
};
