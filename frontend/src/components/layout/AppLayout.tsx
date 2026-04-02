import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { clearChannel, setActiveView } from "@/features/ui/uiSlice";
import { useListChannelsQuery } from "@/features/channels/channelsApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Spinner } from "@/components/ui/Spinner";
import { Sidebar } from "./Sidebar";
import { MembersSidebar } from "./MembersSidebar";
import { GamePanel } from "./GamePanel";
import { ChannelView } from "@/components/chat/ChannelView";
import { FriendsView } from "@/components/friends/FriendsView";
import { GamesView } from "@/components/games/GamesView";
import { InvitesView } from "@/components/invites/InvitesView";

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 -ml-1 text-dim hover:text-foreground cursor-pointer rounded-lg hover:bg-white/5 transition-colors shrink-0"
      aria-label="Back"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
      </svg>
    </button>
  );
}

export function AppLayout() {
  useWebSocket();
  const dispatch = useAppDispatch();
  const { selectedChannel: staleChannel, selectedChannelId, showMembersSidebar, showGamePanel, activeView } = useAppSelector((s) => s.ui);
  const { data: channels, isLoading: channelsLoading } = useListChannelsQuery();
  // Prefer live data from the channels cache; fall back to Redux snapshot for newly created channels not yet fetched
  const selectedChannel = (selectedChannelId && channels?.find((c) => c.id === selectedChannelId)) || staleChannel;

  const showGame = activeView === "chat" && !!selectedChannel && showGamePanel;
  const showMembers = activeView === "chat" && selectedChannel?.type === "ROOM" && showMembersSidebar && !showGamePanel;

  // On mobile: show sidebar when no content is active, show content when something is selected
  const hasActiveContent = !!selectedChannelId || activeView !== "chat";

  const goBack = () => {
    dispatch(clearChannel());
    dispatch(setActiveView("chat"));
  };

  if (channelsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#1A1D2E]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar: always visible on desktop, hidden on mobile when content is active */}
      <div className={`${hasActiveContent ? "hidden" : "flex"} md:flex w-full md:w-auto shrink-0`}>
        <Sidebar />
      </div>

      {/* Main content: always visible on desktop, hidden on mobile when sidebar is showing */}
      <main className={`${hasActiveContent ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0 bg-bg ${showGame ? "pointer-events-none md:pointer-events-auto" : ""}`}>
        {activeView === "friends" ? (
          <>
            <div className="h-16 px-4 flex items-center gap-2 border-b border-white/5 shrink-0 bg-bg/90 backdrop-blur-sm md:hidden">
              <BackButton onClick={goBack} />
              <span className="font-bold text-foreground">Friends</span>
            </div>
            <FriendsView />
          </>
        ) : activeView === "games" ? (
          <>
            <div className="h-16 px-4 flex items-center gap-2 border-b border-white/5 shrink-0 bg-bg/90 backdrop-blur-sm md:hidden">
              <BackButton onClick={goBack} />
              <span className="font-bold text-foreground">Games</span>
            </div>
            <GamesView />
          </>
        ) : activeView === "invites" ? (
          <>
            <div className="h-16 px-4 flex items-center gap-2 border-b border-white/5 shrink-0 bg-bg/90 backdrop-blur-sm md:hidden">
              <BackButton onClick={goBack} />
              <span className="font-bold text-foreground">Invites</span>
            </div>
            <InvitesView />
          </>
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

      {/* Game panel: overlay on mobile, sidebar on desktop */}
      {showGame && <GamePanel channelId={selectedChannel!.id} />}

      {/* Members sidebar: overlay on mobile, sidebar on desktop */}
      {showMembers && (
        <MembersSidebar channelId={selectedChannel.id} channelOwnerId={(selectedChannel as { ownerId: string }).ownerId} />
      )}
    </div>
  );
}
