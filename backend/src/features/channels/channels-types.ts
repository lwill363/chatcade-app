import * as z from "zod";

export const ChannelIdParamsSchema = z.object({
  channelId: z.uuid(),
});
export type ChannelIdParamsDTO = z.infer<typeof ChannelIdParamsSchema>;

export const UserIdParamsSchema = z.object({
  userId: z.uuid(),
});
export type UserIdParamsDTO = z.infer<typeof UserIdParamsSchema>;

export const MemberParamsSchema = z.object({
  channelId: z.uuid(),
  userId: z.uuid(),
});
export type MemberParamsDTO = z.infer<typeof MemberParamsSchema>;

export const InviteIdParamsSchema = z.object({
  inviteId: z.uuid(),
});
export type InviteIdParamsDTO = z.infer<typeof InviteIdParamsSchema>;

export const CreateRoomSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  inviteeIds: z.array(z.uuid()).max(50).optional(),
});
export type CreateRoomDTO = z.infer<typeof CreateRoomSchema>;

export const SendInviteSchema = z.object({
  userId: z.string().uuid(),
});
export type SendInviteDTO = z.infer<typeof SendInviteSchema>;

export const UpdateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});
export type UpdateRoomDTO = z.infer<typeof UpdateRoomSchema>;
