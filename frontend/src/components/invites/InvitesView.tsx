import { useListMyInvitesQuery, useAcceptInviteMutation, useDeclineInviteMutation } from "@/features/channels/channelsApi";
import { Avatar } from "@/components/ui/Avatar";
import { format, isToday, isThisYear } from "date-fns";
import type { ChannelInvite } from "@/types";

function formatInviteTime(isoString: string): string {
  const date = new Date(isoString);
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "M/d/yy");
}

function InviteCard({ invite }: { invite: ChannelInvite }) {
  const [acceptInvite, { isLoading: accepting }] = useAcceptInviteMutation();
  const [declineInvite, { isLoading: declining }] = useDeclineInviteMutation();

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-surface hover:bg-hover transition-colors">
      <Avatar username={invite.channel.name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{invite.channel.name}</p>
        <p className="text-xs text-dim truncate">
          Invited by {invite.inviter.username} · {formatInviteTime(invite.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => void acceptInvite(invite.id)}
          disabled={accepting || declining}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors cursor-pointer disabled:opacity-50"
        >
          Accept
        </button>
        <button
          onClick={() => void declineInvite(invite.id)}
          disabled={accepting || declining}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-raised hover:bg-hover border border-white/10 text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

export function InvitesView() {
  const { data: invites = [], isLoading } = useListMyInvitesQuery(undefined);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
        <h1 className="text-lg font-extrabold text-foreground">Room Invites</h1>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-6">
        {isLoading ? (
          <div className="text-dim text-sm text-center py-12">Loading…</div>
        ) : invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-raised flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-dim">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </div>
            <p className="text-muted text-sm">No pending invites</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-dim mb-2 px-1">
              Pending — {invites.length}
            </h3>
            {invites.map((invite) => (
              <InviteCard key={invite.id} invite={invite} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
