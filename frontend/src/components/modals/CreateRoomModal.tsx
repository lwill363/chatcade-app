import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useCreateRoomMutation } from "@/features/channels/channelsApi";
import { useListFriendsQuery } from "@/features/friends/friendsApi";
import { useAppDispatch } from "@/app/hooks";
import { selectChannel } from "@/features/ui/uiSlice";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const dispatch = useAppDispatch();
  const [createRoom, { isLoading, isError }] = useCreateRoomMutation();
  const { data: friends = [] } = useListFriendsQuery();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [friendSearch, setFriendSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const filteredFriends = friends.filter(
    (f) =>
      friendSearch === "" ||
      f.username.toLowerCase().includes(friendSearch.toLowerCase()) ||
      (f.displayName?.toLowerCase().includes(friendSearch.toLowerCase()) ?? false)
  );

  const toggleFriend = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const room = await createRoom({
        ...data,
        inviteeIds: selectedIds.size > 0 ? [...selectedIds] : undefined,
      }).unwrap();
      dispatch(selectChannel({
        id: room.id,
        type: "ROOM",
        name: room.name,
        description: room.description,
        ownerId: room.ownerId,
        lastMessageId: null,
        unreadCount: 0,
        latestAt: null,
        latestMessage: null,
      }));
      reset();
      setSelectedIds(new Set());
      setFriendSearch("");
      onClose();
    } catch {
      // Error is surfaced via RTK Query isError — modal stays open
    }
  };

  const handleClose = () => {
    reset();
    setSelectedIds(new Set());
    setFriendSearch("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create a Room">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
        <Input
          label="Room Name"
          placeholder="My awesome room"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Description (optional)"
          placeholder="What's this room about?"
          error={errors.description?.message}
          {...register("description")}
        />

        {friends.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted uppercase tracking-widest">
                Invite Friends
              </label>
              {selectedIds.size > 0 && (
                <span className="text-xs text-primary font-semibold">{selectedIds.size} selected</span>
              )}
            </div>
            <Input
              placeholder="Search friends…"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
            <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
              {filteredFriends.length === 0 ? (
                <p className="text-dim text-xs text-center py-3">No friends found</p>
              ) : (
                filteredFriends.map((friend) => {
                  const selected = selectedIds.has(friend.userId);
                  return (
                    <button
                      key={friend.friendshipId}
                      type="button"
                      onClick={() => toggleFriend(friend.userId)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer",
                        selected ? "bg-primary/15" : "hover:bg-hover"
                      )}
                    >
                      <Avatar username={friend.username} size="sm" />
                      <span className={cn(
                        "text-sm font-semibold flex-1 truncate",
                        selected ? "text-primary" : "text-foreground"
                      )}>
                        {friend.displayName ?? friend.username}
                      </span>
                      {selected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary shrink-0">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {isError && (
          <p className="text-xs text-red-400">Failed to create room. Please try again.</p>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Room
          </Button>
        </div>
      </form>
    </Modal>
  );
}
