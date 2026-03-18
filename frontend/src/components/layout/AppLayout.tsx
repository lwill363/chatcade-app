import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { closeGamePanel } from "@/features/ui/uiSlice";
import { useListChannelsQuery } from "@/features/channels/channelsApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Sidebar } from "./Sidebar";
import { MembersSidebar } from "./MembersSidebar";
import { ChannelView } from "@/components/chat/ChannelView";
import { TicTacToeGame } from "@/components/chat/TicTacToeGame";
import { FriendsView } from "@/components/friends/FriendsView";
import { GamesView } from "@/components/games/GamesView";
import { InvitesView } from "@/components/invites/InvitesView";

export function AppLayout() {
  useWebSocket();
  const dispatch = useAppDispatch();
  const { selectedChannel: staleChannel, selectedChannelId, showMembersSidebar, showGamePanel, activeView } = useAppSelector((s) => s.ui);
  const { data: channels } = useListChannelsQuery();
  // Prefer live data from the channels cache; fall back to Redux snapshot for newly created channels not yet fetched
  const selectedChannel = (selectedChannelId && channels?.find((c) => c.id === selectedChannelId)) || staleChannel;

  const showGame = activeView === "chat" && !!selectedChannel && showGamePanel;
  const showMembers = activeView === "chat" && selectedChannel?.type === "ROOM" && showMembersSidebar && !showGamePanel;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-bg">
        {activeView === "friends" ? (
          <FriendsView />
        ) : activeView === "games" ? (
          <GamesView />
        ) : activeView === "invites" ? (
          <InvitesView />
        ) : selectedChannel ? (
          <ChannelView channel={selectedChannel} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-foreground text-2xl font-bold mb-2">Welcome to Chatcade</p>
              <p className="text-dim text-sm">Select a conversation to get started</p>
            </div>
          </div>
        )}
      </main>
      {showGame && (
        <div className="w-72 border-l border-white/5 shrink-0 flex flex-col bg-[#1A1D2E]">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Game</span>
            <button
              onClick={() => dispatch(closeGamePanel())}
              className="p-1 text-dim hover:text-foreground cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
              title="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
          <TicTacToeGame key={selectedChannel!.id} channelId={selectedChannel!.id} />
        </div>
      )}
      {showMembers && (
        <MembersSidebar channelId={selectedChannel.id} channelOwnerId={(selectedChannel as { ownerId: string }).ownerId} />
      )}
    </div>
  );
}
