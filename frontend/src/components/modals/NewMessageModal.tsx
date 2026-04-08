import { useState } from "react";
import { useAppDispatch } from "@/app/hooks";
import { selectChannel } from "@/features/ui/uiSlice";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { useSearchUsersQuery, useGetPresenceQuery } from "@/features/users/usersApi";
import { useListChannelsQuery } from "@/features/channels/channelsApi";
import { cn } from "@/lib/utils";
import type { Channel } from "@/types";

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDm: (userId: string, username: string) => Promise<void>;
}

export function NewMessageModal({ isOpen, onClose, onOpenDm }: NewMessageModalProps) {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<"people" | "rooms">("people");
  const [query, setQuery] = useState("");

  const { data: users, isFetching: isSearching } = useSearchUsersQuery(query.trim(), {
    skip: tab !== "people" || query.trim().length < 2,
  });

  const userIds = users?.map((u) => u.id) ?? [];
  const { data: presence } = useGetPresenceQuery(userIds, { skip: userIds.length === 0 });

  const getStatus = (userId: string): "online" | "away" | "offline" => {
    const entry = presence?.find((p) => p.userId === userId);
    if (!entry) return "offline";
    if (entry.isOnline) return "online";
    if (entry.isAway) return "away";
    return "offline";
  };

  const { data: channels } = useListChannelsQuery();
  const rooms = (channels ?? [])
    .filter((c): c is Extract<Channel, { type: "ROOM" }> => c.type === "ROOM")
    .filter((c) => query.trim() === "" || c.name.toLowerCase().includes(query.trim().toLowerCase()));

  const handleClose = () => {
    onClose();
    setQuery("");
  };

  const handleSelectUser = async (userId: string, username: string) => {
    await onOpenDm(userId, username);
    handleClose();
  };

  const handleSelectRoom = (room: Extract<Channel, { type: "ROOM" }>) => {
    dispatch(selectChannel(room));
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Find or Start a Conversation">
      {/* Tabs */}
      <div className="flex gap-1 mt-3 mb-4 bg-sidebar rounded-xl p-1">
        <button
          onClick={() => { setTab("people"); setQuery(""); }}
          className={cn(
            "flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
            tab === "people" ? "bg-surface text-foreground" : "text-dim hover:text-muted"
          )}
        >
          People
        </button>
        <button
          onClick={() => { setTab("rooms"); setQuery(""); }}
          className={cn(
            "flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer",
            tab === "rooms" ? "bg-surface text-foreground" : "text-dim hover:text-muted"
          )}
        >
          Rooms
        </button>
      </div>

      <Input
        placeholder={tab === "people" ? "Search by username…" : "Filter rooms…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="flex flex-col gap-1 mt-3 min-h-30">
        {tab === "people" && (
          <>
            {query.trim().length < 2 && (
              <p className="text-dim text-xs text-center py-6">Type at least 2 characters to search</p>
            )}
            {query.trim().length >= 2 && isSearching && (
              <div className="flex justify-center py-6"><Spinner size="sm" /></div>
            )}
            {query.trim().length >= 2 && !isSearching && users?.length === 0 && (
              <p className="text-dim text-sm text-center py-6">No users found</p>
            )}
            {query.trim().length >= 2 && !isSearching && users?.map((user) => {
              const status = getStatus(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => void handleSelectUser(user.id, user.username)}
                  className="flex items-center gap-3 bg-raised hover:bg-hover rounded-lg p-3 cursor-pointer transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <Avatar username={user.username} size="sm" />
                    <span className={cn(
                      "absolute bottom-0 right-0 w-2 h-2 rounded-full ring-[1.5px] ring-raised",
                      status === "online" && "bg-green-500",
                      status === "away" && "bg-yellow-500",
                      status === "offline" && "bg-gray-600",
                    )} />
                  </div>
                  <span className="text-sm text-foreground">{user.username}</span>
                </button>
              );
            })}
          </>
        )}

        {tab === "rooms" && (
          <>
            {rooms.length === 0 && (
              <p className="text-dim text-sm text-center py-6">
                {query.trim() ? "No rooms match your search" : "You haven't joined any rooms yet"}
              </p>
            )}
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                className="flex items-center gap-3 bg-raised hover:bg-hover rounded-lg p-3 cursor-pointer transition-colors text-left"
              >
                <Avatar username={room.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-semibold truncate">{room.name}</p>
                  {room.description && (
                    <p className="text-xs text-dim truncate">{room.description}</p>
                  )}
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
