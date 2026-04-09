import { ApiGatewayManagementApiClient, PostToConnectionCommand, GoneException } from "@aws-sdk/client-apigatewaymanagementapi";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { PrismaClient } from "generated/prisma/client";
import { findConnectionsByUserIds, deleteConnection } from "@features/websockets/ws-repository";

export type WsEvent =
  | { type: "message.created"; channelId: string; message: Record<string, unknown> }
  | { type: "message.updated"; channelId: string; message: Record<string, unknown> }
  | { type: "message.deleted"; channelId: string; messageId: string }
  | { type: "typing.start"; channelId: string; userId: string; username: string }
  | { type: "typing.stop"; channelId: string; userId: string }
  | { type: "presence.updated"; userId: string; isOnline: boolean; isAway: boolean }
  | { type: "invite.created"; invite: Record<string, unknown> }
  | { type: "game.updated"; channelId: string; gameId: string }
  | { type: "friend_request.created" }
  | { type: "friend_request.responded"; action: "accept" | "decline" }
  | { type: "pong" };

// Broadcast an event to all active connections for the given user IDs.
// Lazily removes stale connections (410 Gone = connection no longer exists).
export async function broadcastToUsers(
  prisma: PrismaClient,
  callbackUrl: string,
  userIds: string[],
  event: WsEvent
): Promise<void> {
  if (userIds.length === 0) return;

  const connections = await findConnectionsByUserIds(prisma, userIds);
  if (connections.length === 0) return;

  const client = new ApiGatewayManagementApiClient({
    endpoint: callbackUrl,
    requestHandler: new NodeHttpHandler({ connectionTimeout: 2000, requestTimeout: 4000 }),
  });
  const payload = Buffer.from(JSON.stringify(event));

  await Promise.all(
    connections.map(async ({ connectionId }) => {
      try {
        await client.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: payload }));
      } catch (err) {
        if (err instanceof GoneException) {
          // Connection is gone — clean it up lazily
          await deleteConnection(prisma, connectionId);
        }
      }
    })
  );
}

// Broadcast to all members of a channel
export async function broadcastToChannel(
  prisma: PrismaClient,
  callbackUrl: string,
  channelId: string,
  event: WsEvent,
  excludeUserId?: string
): Promise<void> {
  const members = await prisma.channelMember.findMany({
    where: { channelId },
    select: { userId: true },
  });

  const userIds = members
    .map((m) => m.userId)
    .filter((id) => id !== excludeUserId);

  await broadcastToUsers(prisma, callbackUrl, userIds, event);
}
