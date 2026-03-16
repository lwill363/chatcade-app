import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { selectChannel } from "@/features/ui/uiSlice";
import {
  useListFriendsQuery,
  useListIncomingRequestsQuery,
  useListOutgoingRequestsQuery,
  useSendFriendRequestMutation,
  useRespondToRequestMutation,
  useRemoveFriendMutation,
} from "@/features/friends/friendsApi";
import { useGetOrCreateDirectChannelMutation, useListChannelsQuery } from "@/features/channels/channelsApi";
import { useSearchUsersQuery, useGetPresenceQuery } from "@/features/users/usersApi";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { FriendDto, FriendRequestDto, PresenceDto } from "@/types";

type Tab = "all" | "pending" | "add";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-raised flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-dim">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      </div>
      <p className="text-muted text-sm">{message}</p>
    </div>
  );
}

function getPresenceStatus(presence: PresenceDto[] | undefined, userId: string) {
  if (!presence) return "offline" as const;
  const entry = presence.find((p) => p.userId === userId);
  if (!entry) return "offline" as const;
  if (entry.isOnline) return "online" as const;
  if (entry.isAway) return "away" as const;
  return "offline" as const;
}

function PresenceDot({ status }: { status: "online" | "away" | "offline" }) {
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-surface",
        status === "online" && "bg-green-500",
        status === "away" && "bg-yellow-500",
        status === "offline" && "bg-gray-500"
      )}
    />
  );
}

function PresenceLabel({ status }: { status: "online" | "away" | "offline" }) {
  return (
    <span
      className={cn(
        "text-xs font-semibold",
        status === "online" && "text-green-400",
        status === "away" && "text-yellow-400",
        status === "offline" && "text-muted"
      )}
    >
      {status === "online" ? "Online" : status === "away" ? "Away" : "Offline"}
    </span>
  );
}

function AllTab() {
  const dispatch = useAppDispatch();
  const { data: friends = [], isLoading } = useListFriendsQuery();
  const { data: channels } = useListChannelsQuery();
  const [getOrCreateDm] = useGetOrCreateDirectChannelMutation();
  const [removeFriend] = useRemoveFriendMutation();

  const friendIds = friends.map((f) => f.userId);
  const { data: presence } = useGetPresenceQuery(friendIds, {
    skip: friendIds.length === 0,
  });

  const handleMessage = async (friend: FriendDto) => {
    try {
      const result = await getOrCreateDm({ userId: friend.userId }).unwrap();
      const existing = (channels ?? []).find((c) => c.id === result.id);
      if (existing) {
        dispatch(selectChannel(existing));
      } else {
        dispatch(selectChannel({
          id: result.id,
          type: "DM",
          partnerId: friend.userId,
          partnerUsername: friend.username,
          unreadCount: 0,
          latestAt: null,
          latestMessage: null,
        }));
      }
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="text-dim text-sm">Loading…</div></div>;
  }

  if (friends.length === 0) {
    return <EmptyState message="No friends yet. Add some from the Add Friend tab!" />;
  }

  return (
    <div className="flex flex-col gap-1">
      {friends.map((friend) => {
        const status = getPresenceStatus(presence, friend.userId);
        return (
          <div
            key={friend.friendshipId}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface hover:bg-hover transition-colors"
          >
            <div className="relative shrink-0">
              <Avatar username={friend.username} size="md" />
              <PresenceDot status={status} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {friend.displayName ?? friend.username}
              </p>
              <div className="flex items-center gap-1.5">
                {friend.displayName && (
                  <p className="text-xs text-dim truncate">@{friend.username}</p>
                )}
                <PresenceLabel status={status} />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => void handleMessage(friend)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer"
              >
                Message
              </button>
              <button
                onClick={() => void removeFriend(friend.userId)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-raised hover:bg-hover border border-white/10 text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PendingTab() {
  const { data: incoming = [], isLoading: loadingIncoming } = useListIncomingRequestsQuery();
  const { data: outgoing = [], isLoading: loadingOutgoing } = useListOutgoingRequestsQuery();
  const [respondToRequest, { isLoading: responding }] = useRespondToRequestMutation();
  const [removeFriend, { isLoading: cancelling }] = useRemoveFriendMutation();

  const handleRespond = async (requesterId: string, action: "accept" | "decline") => {
    try {
      await respondToRequest({ requesterId, action }).unwrap();
    } catch {
      // ignore
    }
  };

  const handleCancel = async (userId: string) => {
    try {
      await removeFriend(userId).unwrap();
    } catch {
      // ignore
    }
  };

  const isLoading = loadingIncoming || loadingOutgoing;

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="text-dim text-sm">Loading…</div></div>;
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return <EmptyState message="No pending friend requests." />;
  }

  const RequestRow = ({ req, type }: { req: FriendRequestDto; type: "incoming" | "outgoing" }) => (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface hover:bg-hover transition-colors">
      <Avatar username={req.username} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">
          {req.displayName ?? req.username}
        </p>
        {req.displayName && (
          <p className="text-xs text-dim truncate">@{req.username}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {type === "incoming" ? (
          <>
            <button
              onClick={() => void handleRespond(req.userId, "accept")}
              disabled={responding}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => void handleRespond(req.userId, "decline")}
              disabled={responding}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-raised hover:bg-hover border border-white/10 text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              Decline
            </button>
          </>
        ) : (
          <button
            onClick={() => void handleCancel(req.userId)}
            disabled={cancelling}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-raised hover:bg-hover border border-white/10 text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {incoming.length > 0 && (
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-dim mb-2 px-1">
            Incoming — {incoming.length}
          </h3>
          <div className="flex flex-col gap-1">
            {incoming.map((req) => (
              <RequestRow key={req.friendshipId} req={req} type="incoming" />
            ))}
          </div>
        </div>
      )}
      {outgoing.length > 0 && (
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-dim mb-2 px-1">
            Outgoing — {outgoing.length}
          </h3>
          <div className="flex flex-col gap-1">
            {outgoing.map((req) => (
              <RequestRow key={req.friendshipId} req={req} type="outgoing" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddFriendTab() {
  const [query, setQuery] = useState("");
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const { data: friends = [] } = useListFriendsQuery();
  const { data: outgoing = [] } = useListOutgoingRequestsQuery();
  const { data: incoming = [] } = useListIncomingRequestsQuery();
  const currentUser = useAppSelector((s) => s.auth.user);

  const { data: users } = useSearchUsersQuery(query.trim(), {
    skip: query.trim().length < 2,
  });

  const [sendFriendRequest] = useSendFriendRequestMutation();

  const friendIds = new Set(friends.map((f) => f.userId));
  const outgoingIds = new Set(outgoing.map((r) => r.userId));
  const incomingIds = new Set(incoming.map((r) => r.userId));

  const handleSend = async (userId: string) => {
    setErrorById((prev) => ({ ...prev, [userId]: "" }));
    try {
      await sendFriendRequest({ addresseeId: userId }).unwrap();
      setSentIds((prev) => new Set(prev).add(userId));
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data
          ? String((err.data as { message: unknown }).message)
          : "Failed to send request";
      setErrorById((prev) => ({ ...prev, [userId]: msg }));
    }
  };

  const getStatus = (userId: string): "self" | "friend" | "incoming" | "outgoing" | "sent" | "none" => {
    if (userId === currentUser?.id) return "self";
    if (friendIds.has(userId)) return "friend";
    if (incomingIds.has(userId)) return "incoming";
    if (outgoingIds.has(userId) || sentIds.has(userId)) return "outgoing";
    return "none";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface rounded-xl p-4 border border-white/5">
        <h3 className="text-sm font-bold text-foreground mb-1">Add a Friend</h3>
        <p className="text-xs text-dim mb-3">Search for users by username to send them a friend request.</p>
        <Input
          placeholder="Search by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="text-dim text-xs text-center py-4">Type at least 2 characters to search</p>
      )}
      {query.trim().length >= 2 && users?.length === 0 && (
        <p className="text-muted text-sm text-center py-6">No users found for "{query}"</p>
      )}

      {users && users.length > 0 && (
        <div className="flex flex-col gap-1">
          {users.map((user) => {
            const status = getStatus(user.id);
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface hover:bg-hover transition-colors"
              >
                <Avatar username={user.username} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{user.username}</p>
                  {errorById[user.id] && (
                    <p className="text-xs text-red-400 truncate">{errorById[user.id]}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {status === "self" && (
                    <span className="text-xs text-dim font-semibold">That's you</span>
                  )}
                  {status === "friend" && (
                    <span className="text-xs text-primary font-semibold">Already friends</span>
                  )}
                  {status === "incoming" && (
                    <span className="text-xs text-muted font-semibold">Sent you a request</span>
                  )}
                  {status === "outgoing" && (
                    <span className="text-xs text-muted font-semibold">Request sent</span>
                  )}
                  {status === "none" && (
                    <button
                      onClick={() => void handleSend(user.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FriendsView() {
  const [tab, setTab] = useState<Tab>("all");
  const { data: incoming = [] } = useListIncomingRequestsQuery();
  const pendingCount = incoming.length;

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "add", label: "Add Friend" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
        <h1 className="text-lg font-extrabold text-foreground mb-4">Friends</h1>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "relative px-4 py-1.5 text-sm font-bold rounded-lg transition-colors cursor-pointer",
                tab === key
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:bg-hover hover:text-foreground"
              )}
            >
              {label}
              {key === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-primary text-white text-[10px] font-extrabold px-1">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-6">
        {tab === "all" && <AllTab />}
        {tab === "pending" && <PendingTab />}
        {tab === "add" && <AddFriendTab />}
      </div>
    </div>
  );
}
