import { PrismaClient } from "generated/prisma/client";

const MESSAGE_SELECT = {
  id: true,
  type: true,
  content: true,
  metadata: true,
  channelId: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, username: true } },
} as const;

export function createSystemMessage(
  prisma: PrismaClient,
  data: { channelId: string; authorId: string; content: "joined" | "left" | "removed" }
) {
  return prisma.message.create({ data: { ...data, type: "SYSTEM" }, select: MESSAGE_SELECT });
}
