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
  | { type: "pong" };

const WS_URL = import.meta.env.VITE_WS_URL as string | undefined;

export function useWebSocket() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const typingTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (!accessToken || !WS_URL) return;

    wsService.connect(WS_URL, accessToken);

    const unsubscribe = wsService.onMessage((raw) => {
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
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
      for (const t of typingTimeouts.current.values()) clearTimeout(t);
      typingTimeouts.current.clear();
    };
  }, [accessToken, dispatch]);
}
