import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { toggleMembersSidebar, closeGamePanel } from "@/features/ui/uiSlice";
import { useMarkChannelReadMutation } from "@/features/channels/channelsApi";
import { useGetPresenceQuery } from "@/features/users/usersApi";
import { Avatar } from "@/components/ui/Avatar";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import type { Channel } from "@/types";

interface ChannelViewProps {
  channel: Channel;
}

export function ChannelView({ channel }: ChannelViewProps) {
  const dispatch = useAppDispatch();
  const { showMembersSidebar } = useAppSelector((s) => s.ui);
  const [markChannelRead] = useMarkChannelReadMutation();

  useEffect(() => {
    if (channel.lastMessageId) {
      void markChannelRead({ channelId: channel.id, messageId: channel.lastMessageId });
    }
    dispatch(closeGamePanel());
  }, [channel.id, channel.lastMessageId, markChannelRead, dispatch]);

  const title = channel.type === "ROOM" ? channel.name : channel.partnerUsername;
  const subtitle = channel.type === "ROOM" ? channel.description : null;
  const channelOwnerId = channel.type === "ROOM" ? channel.ownerId : undefined;
  const partnerUsername = channel.type === "DM" ? channel.partnerUsername : undefined;
  const partnerId = channel.type === "DM" ? channel.partnerId : undefined;

  const currentUserId = useAppSelector((s) => s.auth.user?.id);
  const typingUsers = useAppSelector((s) =>
    (s.ui.typingUsers[channel.id] ?? []).filter((u) => u.userId !== currentUserId)
  );

  const { data: partnerPresence } = useGetPresenceQuery(
    partnerId ? [partnerId] : [],
    { skip: !partnerId }
  );
  const partnerStatus = (() => {
    const entry = partnerPresence?.[0];
    if (!entry) return "offline" as const;
    if (entry.isOnline) return "online" as const;
    if (entry.isAway) return "away" as const;
    return "offline" as const;
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-white/5 shrink-0 bg-bg/90 backdrop-blur-sm">
        {channel.type === "DM" && partnerUsername && (
          <div className="relative shrink-0">
            <Avatar username={partnerUsername} size="md" />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-bg ${
              partnerStatus === "online" ? "bg-green-500" :
              partnerStatus === "away" ? "bg-yellow-500" : "bg-gray-600"
            }`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3
            className="text-foreground font-bold text-base leading-tight"
            style={channel.type === "ROOM" ? { fontFamily: "'Fraunces', serif", fontStyle: "italic" } : undefined}
          >
            {title}
          </h3>
          {subtitle && <p className="text-muted text-xs truncate mt-0.5">{subtitle}</p>}
          {channel.type === "DM" && (
            <p className={`text-xs mt-0.5 font-medium ${
              partnerStatus === "online" ? "text-green-500" :
              partnerStatus === "away" ? "text-yellow-500" : "text-dim"
            }`}>
              {partnerStatus === "online" ? "Online" : partnerStatus === "away" ? "Away" : "Offline"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {channel.type === "ROOM" && (
            <button
              onClick={() => dispatch(toggleMembersSidebar())}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showMembersSidebar
                  ? "text-foreground bg-white/10"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
              title="Toggle Members"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <MessageList key={channel.id} channelId={channel.id} channelOwnerId={channelOwnerId} />
      <div className="px-5 h-5 shrink-0 flex items-center">
        {typingUsers.length > 0 && (
          <p className="text-xs text-dim animate-pulse">
            {typingUsers.map((u) => u.username).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </p>
        )}
      </div>
      <MessageInput channelId={channel.id} placeholder={`Message ${title}`} />
    </div>
  );
}
