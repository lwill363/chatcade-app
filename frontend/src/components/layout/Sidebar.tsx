import { useState } from "react";
import { format, isToday, isThisYear } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { selectChannel, clearChannel, setActiveView } from "@/features/ui/uiSlice";
import { useListChannelsQuery, useGetOrCreateDirectChannelMutation, useListMyInvitesQuery } from "@/features/channels/channelsApi";
import { useGetPresenceQuery } from "@/features/users/usersApi";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { CreateRoomModal } from "@/components/modals/CreateRoomModal";
import { NewMessageModal } from "@/components/modals/NewMessageModal";
import { UserSettingsModal } from "@/components/modals/UserSettingsModal";
import type { Channel } from "@/types";

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="shrink-0 min-w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function compactTime(isoString: string | null): string | undefined {
  if (!isoString) return undefined;
  const date = new Date(isoString);
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "M/d/yy");
}

function ChannelItem({ channel, isActive, onClick, presenceStatus }: { channel: Channel; isActive: boolean; onClick: () => void; presenceStatus?: "online" | "away" | "offline" }) {
  const unread = !isActive ? channel.unreadCount : 0;
  const timeStr = compactTime(channel.latestAt);
  const name = channel.type === "DM" ? channel.partnerUsername : channel.name;
  const preview = channel.type === "DM"
    ? (channel.latestMessage?.content ?? null)
    : (channel.latestMessage ? `${channel.latestMessage.authorUsername}: ${channel.latestMessage.content}` : null);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-left",
        isActive ? "bg-primary/15" : "hover:bg-hover"
      )}
    >
      <div className="relative shrink-0">
        <Avatar username={name} size="md" />
        {presenceStatus && (
          <span className={cn(
            "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-sidebar",
            presenceStatus === "online" && "bg-green-500",
            presenceStatus === "away" && "bg-yellow-500",
            presenceStatus === "offline" && "bg-gray-600",
          )} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={cn("text-sm font-bold truncate", isActive ? "text-primary" : unread > 0 ? "text-foreground" : "text-muted")}>
            {name}
          </span>
          {timeStr && <span className="text-xs text-dim shrink-0">{timeStr}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {preview && <p className="flex-1 text-xs text-dim truncate">{preview}</p>}
          {unread > 0 && <UnreadBadge count={unread} />}
        </div>
      </div>
    </button>
  );
}

function SectionHeader({ title, totalUnread, expanded, onToggle, onAdd }: {
  title: string;
  totalUnread: number;
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center px-3 py-1.5 gap-1">
      <button onClick={onToggle} className="flex-1 flex items-center gap-1.5 text-left group cursor-pointer">
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="currentColor"
          className={cn("text-dim transition-transform shrink-0", expanded ? "rotate-90" : "rotate-0")}
        >
          <path d="M8 5l8 7-8 7V5z" />
        </svg>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-dim group-hover:text-muted transition-colors">
          {title}
        </span>
        {totalUnread > 0 && !expanded && <UnreadBadge count={totalUnread} />}
      </button>
      <button
        onClick={onAdd}
        className="p-1 text-dim hover:text-muted transition-colors cursor-pointer rounded"
        title={`New ${title.replace(/s$/, "")}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
    </div>
  );
}

export function Sidebar() {
  const dispatch = useAppDispatch();
  const { selectedChannelId, activeView } = useAppSelector((s) => s.ui);
  const currentUser = useAppSelector((s) => s.auth.user);

  const { data: channels, isLoading } = useListChannelsQuery();
  const [getOrCreateDm] = useGetOrCreateDirectChannelMutation();

  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [dmExpanded, setDmExpanded] = useState(true);
  const [roomsExpanded, setRoomsExpanded] = useState(true);
  const { data: invites = [] } = useListMyInvitesQuery(undefined, { pollingInterval: 30000 });

  const byLatest = (a: Channel, b: Channel) => {
    if (!a.latestAt && !b.latestAt) return 0;
    if (!a.latestAt) return 1;
    if (!b.latestAt) return -1;
    return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
  };

  const dms = (channels ?? []).filter((c) => c.type === "DM").sort(byLatest);
  const rooms = (channels ?? []).filter((c) => c.type === "ROOM").sort(byLatest);
  const dmUnread = dms.reduce((sum, c) => sum + c.unreadCount, 0);
  const roomUnread = rooms.reduce((sum, c) => sum + c.unreadCount, 0);

  const dmPartnerIds = dms.map((c) => c.partnerId);
  const { data: dmPresence } = useGetPresenceQuery(dmPartnerIds, { skip: dmPartnerIds.length === 0, pollingInterval: 30_000 });

  const getDmPresence = (partnerId: string): "online" | "away" | "offline" => {
    const entry = dmPresence?.find((p) => p.userId === partnerId);
    if (!entry) return "offline";
    if (entry.isOnline) return "online";
    if (entry.isAway) return "away";
    return "offline";
  };

  const handleOpenDm = async (userId: string, partnerUsername: string) => {
    try {
      const result = await getOrCreateDm({ userId }).unwrap();
      const existing = (channels ?? []).find((c) => c.id === result.id);
      if (existing) {
        dispatch(selectChannel(existing));
      } else {
        dispatch(selectChannel({
          id: result.id,
          type: "DM",
          partnerId: userId,
          partnerUsername,
          unreadCount: 0,
          latestAt: null,
          latestMessage: null,
        }));
      }
    } catch {
      // ignore
    }
  };

  const displayName = currentUser?.displayName ?? currentUser?.username ?? "";

  return (
    <>
      <nav className="w-64 bg-sidebar flex flex-col shrink-0 border-r border-white/5">

        {/* Find or start a conversation */}
        <div className="px-3 pt-4 pb-2 shrink-0">
          <button
            onClick={() => setShowNewMessage(true)}
            className="w-full flex items-center gap-2.5 bg-raised border border-white/10 hover:border-white/20 rounded-xl px-3.5 py-2.5 text-left transition-all cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-dim shrink-0">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <span className="text-sm text-dim">Find or start a conversation</span>
          </button>
        </div>

        {/* Nav items */}
        <div className="px-3 pb-2 shrink-0 flex flex-col gap-0.5">
          <button
            onClick={() => { dispatch(setActiveView("friends")); dispatch(clearChannel()); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left",
              activeView === "friends" ? "bg-primary/15 text-primary" : "text-muted hover:bg-hover hover:text-foreground"
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            <span className="text-sm font-bold">Friends</span>
          </button>
          <button
            onClick={() => { dispatch(setActiveView("games")); dispatch(clearChannel()); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left",
              activeView === "games" ? "bg-primary/15 text-primary" : "text-muted hover:bg-hover hover:text-foreground"
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 10 18.5 10s1.5.67 1.5 1.5S19.33 12 18.5 12z" />
            </svg>
            <span className="text-sm font-bold">Games</span>
          </button>
          <button
            onClick={() => { dispatch(setActiveView("invites")); dispatch(clearChannel()); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left",
              activeView === "invites" ? "bg-primary/15 text-primary" : "text-muted hover:bg-hover hover:text-foreground"
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
            <span className="text-sm font-bold flex-1">Invites</span>
            {invites.length > 0 && (
              <span className="shrink-0 min-w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center px-1">
                {invites.length > 99 ? "99+" : invites.length}
              </span>
            )}
          </button>
        </div>

        <div className="mx-3 h-px bg-white/5 shrink-0" />

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pt-2 cursor-default select-none bg-sidebar">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          )}

          {/* Direct Messages */}
          <SectionHeader
            title="Direct Messages"
            totalUnread={dmUnread}
            expanded={dmExpanded}
            onToggle={() => setDmExpanded((v) => !v)}
            onAdd={() => setShowNewMessage(true)}
          />
          {dmExpanded && (
            <>
              {dms.length === 0 && !isLoading && (
                <p className="text-dim text-xs px-4 pb-3">No conversations yet.</p>
              )}
              {dms.map((c) => (
                <ChannelItem
                  key={c.id}
                  channel={c}
                  isActive={c.id === selectedChannelId}
                  onClick={() => dispatch(selectChannel(c))}
                  presenceStatus={getDmPresence(c.partnerId)}
                />
              ))}
            </>
          )}

          <div className="h-3" />

          {/* Rooms */}
          <SectionHeader
            title="Rooms"
            totalUnread={roomUnread}
            expanded={roomsExpanded}
            onToggle={() => setRoomsExpanded((v) => !v)}
            onAdd={() => setShowCreateRoom(true)}
          />
          {roomsExpanded && (
            <>
              {rooms.length === 0 && !isLoading && (
                <p className="text-dim text-xs px-4 pb-3">No rooms yet.</p>
              )}
              {rooms.map((c) => (
                <ChannelItem
                  key={c.id}
                  channel={c}
                  isActive={c.id === selectedChannelId}
                  onClick={() => dispatch(selectChannel(c))}
                />
              ))}
            </>
          )}
        </div>

        {/* User footer */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5 shrink-0 hover:bg-hover transition-colors cursor-pointer" onClick={() => setShowUserSettings(true)}>
          <div className="relative shrink-0">
            <Avatar username={currentUser?.displayName ?? currentUser?.username ?? "?"} size="md" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-sidebar" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
            <p className="text-xs text-green-500 font-medium">Online</p>
          </div>
          <button
            className="p-1.5 text-dim hover:text-muted rounded-lg hover:bg-white/5 cursor-pointer shrink-0 transition-colors"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </button>
        </div>
      </nav>

      <CreateRoomModal isOpen={showCreateRoom} onClose={() => setShowCreateRoom(false)} />
      <NewMessageModal isOpen={showNewMessage} onClose={() => setShowNewMessage(false)} onOpenDm={handleOpenDm} />
      <UserSettingsModal isOpen={showUserSettings} onClose={() => setShowUserSettings(false)} />
    </>
  );
}
