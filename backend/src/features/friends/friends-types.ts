import * as z from "zod";

export const RequesterIdParamsSchema = z.object({
  requesterId: z.uuid(),
});
export type RequesterIdParamsDTO = z.infer<typeof RequesterIdParamsSchema>;

export const FriendIdParamsSchema = z.object({
  friendId: z.uuid(),
});
export type FriendIdParamsDTO = z.infer<typeof FriendIdParamsSchema>;

export const SendFriendRequestSchema = z.object({
  addresseeId: z.uuid(),
});
export type SendFriendRequestDTO = z.infer<typeof SendFriendRequestSchema>;

export const RespondToRequestSchema = z.object({
  action: z.enum(["accept", "decline"]),
});
export type RespondToRequestDTO = z.infer<typeof RespondToRequestSchema>;
