import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { useListMessagesQuery } from "@/features/messages/messagesApi";
import { MessageItem } from "./MessageItem";
import { Spinner } from "@/components/ui/Spinner";
import type { Message } from "@/types";

interface MessageListProps {
  channelId: string;
  channelOwnerId?: string;
}

export function MessageList({ channelId, channelOwnerId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const hasScrolledInitially = useRef(false);
  // Saved before older messages are prepended; used to restore scroll position after DOM update
  const scrollAnchorRef = useRef<number | null>(null);

  const [beforeCursor, setBeforeCursor] = useState<string | undefined>();
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  // Reset all state when channel changes
  useEffect(() => {
    setOlderMessages([]);
    setBeforeCursor(undefined);
    setHasMoreOlder(true);
    hasScrolledInitially.current = false;
  }, [channelId]);

  // Latest 50 messages — updated in real-time via WebSocket events
  const { data: latestMessages, isFetching: isFetchingLatest } = useListMessagesQuery(
    { channelId, limit: 50 }
  );

  // Fires only when cursor is set (triggered by scroll-to-top)
  const { data: olderBatch, isFetching: isFetchingOlder } = useListMessagesQuery(
    { channelId, limit: 50, before: beforeCursor },
    { skip: !beforeCursor }
  );

  // Accumulate older messages when a batch arrives
  useEffect(() => {
    if (!olderBatch || !beforeCursor) return;
    setOlderMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const newOnes = olderBatch.filter((m) => !ids.has(m.id));
      return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
    });
    setHasMoreOlder(olderBatch.length === 50);
  }, [olderBatch, beforeCursor]);

  // After older messages are prepended into the DOM, restore scroll position so the
  // viewport doesn't jump. useLayoutEffect fires before the browser paints.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || scrollAnchorRef.current === null) return;
    el.scrollTop += el.scrollHeight - scrollAnchorRef.current;
    scrollAnchorRef.current = null;
  }, [olderMessages]);

  // Merge: older (accumulated) + latest (from server), deduped
  const allMessages = useMemo(() => {
    if (!latestMessages) return olderMessages;
    const latestIds = new Set(latestMessages.map((m) => m.id));
    return [...olderMessages.filter((m) => !latestIds.has(m.id)), ...latestMessages];
  }, [latestMessages, olderMessages]);

  // Scroll to bottom on initial load and when new messages arrive while at bottom
  useEffect(() => {
    if (!latestMessages || latestMessages.length === 0) return;
    if (!hasScrolledInitially.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      hasScrolledInitially.current = true;
      return;
    }
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [latestMessages]);

  // True if there are potentially more older messages to fetch
  const canLoadOlder = olderMessages.length === 0
    ? latestMessages?.length === 50
    : hasMoreOlder;

  const loadOlder = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    scrollAnchorRef.current = el.scrollHeight;
    const oldest = olderMessages[0] ?? latestMessages?.[0];
    if (oldest) setBeforeCursor(oldest.id);
  }, [olderMessages, latestMessages]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;

    // Auto-fetch when scrolled within 150px of the top
    if (el.scrollTop < 150 && canLoadOlder && !isFetchingOlder) {
      loadOlder();
    }
  }, [canLoadOlder, isFetchingOlder, loadOlder]);

  const isFirstInGroup = (index: number) => {
    if (index === 0) return true;
    const curr = allMessages[index];
    const prev = allMessages[index - 1];
    if (curr.author?.id !== prev.author?.id) return true;
    return new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;
  };

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto flex flex-col py-4">
      {isFetchingOlder && (
        <div className="flex justify-center py-3">
          <Spinner size="sm" />
        </div>
      )}

      {!canLoadOlder && allMessages.length > 0 && !isFetchingOlder && (
        <p className="text-center text-[#6b6b6b] text-xs py-3">Beginning of conversation</p>
      )}

      {allMessages.length === 0 && !isFetchingLatest && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#6b6b6b] text-sm">No messages yet. Be the first to say something!</p>
        </div>
      )}

      {allMessages.length === 0 && isFetchingLatest && (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      )}

      <div className="flex-1" />

      <div className="flex flex-col gap-0">
        {allMessages.map((message, index) => (
          <MessageItem
            key={message.id}
            message={message}
            isFirst={isFirstInGroup(index)}
            channelOwnerId={channelOwnerId}
          />
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
