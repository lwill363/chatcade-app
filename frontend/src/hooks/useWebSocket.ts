import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { wsService } from "@/services/wsService";
import { api } from "@/services/api";
import { messagesApi } from "@/features/messages/messagesApi";
import { setTyping, clearTyping } from "@/features/ui/uiSlice";
import type { Message } from "@/types";

type WsEvent =
  | { type: "message.created"; channelId: string; message: Message }
  | { type: "message.updated"; channelId: string; message: Message }
  | { type: "message.deleted"; channelId: string; messageId: string }
  | { type: "typing.start"; channelId: string; userId: string; username: string }
  | { type: "typing.stop"; channelId: string; userId: string }
  | { type: "presence.updated"; userId: string; isOnline: boolean; isAway: boolean }
  | { type: "invite.created" }
  | { type: "game.updated"; channelId: string; gameId: string }
  | { type: "friend_request.created" }
  | { type: "friend_request.responded"; action: "accept" | "decline" }
  | { type: "pong" };

const WS_URL = import.meta.env.VITE_WS_URL as string | undefined;

export function useWebSocket() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const userId = useAppSelector((s) => s.auth.user?.id);
  const typingTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Keep the stored token fresh so reconnect attempts after server-side
  // disconnections always use the latest token. Does NOT trigger a reconnect.
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  useEffect(() => {
    if (accessToken) wsService.updateToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!userId || !WS_URL) return;
    const token = accessTokenRef.current;
    if (!token) return;

    wsService.connect(WS_URL, token);

    const unsubscribeConnect = wsService.onConnect((isReconnect) => {
      if (isReconnect) {
        // Invalidate anything that could have changed while we were disconnected
        dispatch(api.util.invalidateTags([
          { type: "Channel", id: "LIST" },
          { type: "Friend", id: "LIST" },
          { type: "FriendRequest", id: "INCOMING" },
          { type: "FriendRequest", id: "OUTGOING" },
          { type: "Invite", id: "LIST" },
        ]));
      }
    });

    const unsubscribeMessage = wsService.onMessage((raw) => {
      const event = raw as WsEvent;
      switch (event.type) {
        case "message.created": {
          dispatch(
            messagesApi.util.updateQueryData("listMessages", { channelId: event.channelId, limit: 50 }, (draft) => {
              const msg = event.message;
              if (!draft.some((m) => m.id === msg.id)) {
                draft.push(msg);
                if (draft.length > 50) draft.splice(0, draft.length - 50);
              }
            })
          );
          dispatch(api.util.invalidateTags([{ type: "Channel", id: "LIST" }]));
          break;
        }
        case "message.updated": {
          dispatch(
            messagesApi.util.updateQueryData("listMessages", { channelId: event.channelId, limit: 50 }, (draft) => {
              const msg = event.message;
              const idx = draft.findIndex((m) => m.id === msg.id);
              if (idx !== -1) draft[idx] = msg;
            })
          );
          break;
        }
        case "message.deleted": {
          dispatch(
            messagesApi.util.updateQueryData("listMessages", { channelId: event.channelId, limit: 50 }, (draft) => {
              const idx = draft.findIndex((m) => m.id === event.messageId);
              if (idx !== -1) draft[idx] = { ...draft[idx], deletedAt: new Date().toISOString() };
            })
          );
          break;
        }
        case "typing.start": {
          dispatch(setTyping({ channelId: event.channelId, userId: event.userId, username: event.username }));
          const key = `${event.channelId}:${event.userId}`;
          const existing = typingTimeouts.current.get(key);
          if (existing) clearTimeout(existing);
          typingTimeouts.current.set(
            key,
            setTimeout(() => {
              dispatch(clearTyping({ channelId: event.channelId, userId: event.userId }));
              typingTimeouts.current.delete(key);
            }, 4000)
          );
          break;
        }
        case "typing.stop": {
          const key = `${event.channelId}:${event.userId}`;
          const existing = typingTimeouts.current.get(key);
          if (existing) { clearTimeout(existing); typingTimeouts.current.delete(key); }
          dispatch(clearTyping({ channelId: event.channelId, userId: event.userId }));
          break;
        }
        case "presence.updated": {
          dispatch(api.util.invalidateTags([{ type: "Presence", id: "LIST" }]));
          break;
        }
        case "invite.created": {
          dispatch(api.util.invalidateTags([{ type: "Invite", id: "LIST" }]));
          break;
        }
        case "game.updated": {
          dispatch(api.util.invalidateTags([
            { type: "Game", id: `channel-${event.channelId}` },
            { type: "Game", id: "ACTIVE_LIST" },
          ]));
          break;
        }
        case "friend_request.created": {
          dispatch(api.util.invalidateTags([{ type: "FriendRequest", id: "INCOMING" }]));
          break;
        }
        case "friend_request.responded": {
          dispatch(api.util.invalidateTags([
            { type: "Friend", id: "LIST" },
            { type: "FriendRequest", id: "OUTGOING" },
          ]));
          break;
        }
      }
    });

    return () => {
      unsubscribeConnect();
      unsubscribeMessage();
      wsService.disconnect();
      for (const t of typingTimeouts.current.values()) clearTimeout(t);
      typingTimeouts.current.clear();
    };
  }, [userId, dispatch]);
}
