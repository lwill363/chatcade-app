import * as z from "zod";

export const ChannelIdParamsSchema = z.object({
  channelId: z.uuid(),
});
export type ChannelIdParamsDTO = z.infer<typeof ChannelIdParamsSchema>;

export const ChannelMessageParamsSchema = z.object({
  channelId: z.uuid(),
  messageId: z.uuid(),
});
export type ChannelMessageParamsDTO = z.infer<typeof ChannelMessageParamsSchema>;

export const SendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content is required")
    .max(2000, "Message must be at most 2000 characters"),
});
export type SendMessageDTO = z.infer<typeof SendMessageSchema>;

export const EditMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content is required")
    .max(2000, "Message must be at most 2000 characters"),
});
export type EditMessageDTO = z.infer<typeof EditMessageSchema>;

export const ListMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.uuid().optional(),
});
export type ListMessagesQueryDTO = z.infer<typeof ListMessagesQuerySchema>;
