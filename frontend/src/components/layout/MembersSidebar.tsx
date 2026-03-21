import { useState } from "react";
import { useListChannelMembersQuery, useSendInviteMutation, useKickChannelMemberMutation } from "@/features/channels/channelsApi";
import { useGetPresenceQuery } from "@/features/users/usersApi";
import { useListFriendsQuery } from "@/features/friends/friendsApi";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { toggleMembersSidebar } from "@/features/ui/uiSlice";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface MembersSidebarProps {
  channelId: string;
  channelOwnerId: string;
}

export function MembersSidebar({ channelId, channelOwnerId }: MembersSidebarProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const { data: members, isLoading } = useListChannelMembersQuery(channelId);
  const memberIds = members?.map((m) => m.user.id) ?? [];
  const { data: presence } = useGetPresenceQuery(memberIds, { skip: memberIds.length === 0 });

  const isOwner = currentUser?.id === channelOwnerId;
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [sendInvite] = useSendInviteMutation();
  const [kickMember] = useKickChannelMemberMutation();
  const { data: friends = [] } = useListFriendsQuery(undefined, { skip: !isOwner });

  const getStatus = (userId: string) => {
    const entry = presence?.find((p) => p.userId === userId);
    if (!entry) return "offline" as const;
    if (entry.isOnline) return "online" as const;
    if (entry.isAway) return "away" as const;
    return "offline" as const;
  };

  const memberUserIds = new Set(memberIds);
  const eligibleFriends = friends.filter(
    (f) =>
      !memberUserIds.has(f.userId) &&
      (addQuery === "" ||
        f.username.toLowerCase().includes(addQuery.toLowerCase()) ||
        (f.displayName?.toLowerCase().includes(addQuery.toLowerCase()) ?? false))
  );

  const handleAdd = async (userId: string) => {
    try {
      await sendInvite({ channelId, userId }).unwrap();
      setAddQuery("");
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-sidebar md:relative md:inset-auto md:z-auto md:w-52 md:border-l md:border-white/5 md:shrink-0">
      <div className="h-16 px-4 flex items-center border-b border-white/5 shrink-0 gap-2">
        <button
          onClick={() => dispatch(toggleMembersSidebar())}
          className="md:hidden p-1 text-dim hover:text-foreground cursor-pointer rounded-lg hover:bg-white/5 transition-colors shrink-0"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-dim flex-1">
          Members — {members?.length ?? 0}
        </span>
        {isOwner && (
          <button
            onClick={() => { setShowAdd((v) => !v); setAddQuery(""); }}
            className={cn(
              "p-1 rounded-lg transition-colors cursor-pointer",
              showAdd ? "text-foreground bg-white/10" : "text-dim hover:text-muted hover:bg-white/5"
            )}
            title="Add member"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        )}
      </div>

      {isOwner && showAdd && (
        <div className="px-3 py-2.5 border-b border-white/5 flex flex-col gap-1.5">
          <input
            autoFocus
            placeholder="Search friends…"
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            className="w-full bg-raised border border-white/10 text-foreground placeholder:text-dim text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
          />
          <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
            {eligibleFriends.length === 0 ? (
              <p className="text-dim text-xs text-center py-2">
                {friends.filter((f) => !memberUserIds.has(f.userId)).length === 0
                  ? "All friends are already members"
                  : "No friends match"}
              </p>
            ) : (
              eligibleFriends.map((friend) => (
                <button
                  key={friend.friendshipId}
                  onClick={() => void handleAdd(friend.userId)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-hover transition-colors cursor-pointer text-left"
                >
                  <Avatar username={friend.username} size="sm" />
                  <span className="text-xs font-semibold text-foreground truncate flex-1">
                    {friend.displayName ?? friend.username}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-primary shrink-0">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="flex justify-center mt-4">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {members?.map((member) => {
              const isOwnerMember = member.user.id === channelOwnerId;
              const isMe = member.user.id === currentUser?.id;
              const canKick = isOwner && !isOwnerMember && !isMe;
              return (
                <div
                  key={member.user.id}
                  className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-hover transition-colors"
                >
                  <div className="relative shrink-0">
                    <Avatar username={member.user.username} size="sm" />
                    <span className={cn(
                      "absolute bottom-0 right-0 w-2 h-2 rounded-full ring-[1.5px] ring-sidebar",
                      getStatus(member.user.id) === "online" && "bg-green-500",
                      getStatus(member.user.id) === "away" && "bg-yellow-500",
                      getStatus(member.user.id) === "offline" && "bg-gray-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-semibold truncate">
                      {member.user.username}
                      {isMe && <span className="text-dim font-normal ml-1 text-xs">(you)</span>}
                    </p>
                    {isOwnerMember && <p className="text-[11px] text-primary font-bold">Owner</p>}
                  </div>
                  {canKick && (
                    <button
                      onClick={() => void kickMember({ channelId, userId: member.user.id })}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-dim hover:text-red-400 transition-all cursor-pointer shrink-0"
                      title={`Kick ${member.user.username}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
