import { useAppDispatch } from "@/app/hooks";
import { closeGamePanel } from "@/features/ui/uiSlice";
import { TicTacToeGame } from "@/components/chat/TicTacToeGame";

interface GamePanelProps {
  channelId: string;
}

/**
 * Generic game panel — renders on the right sidebar on desktop,
 * full-screen overlay on mobile. To add a new game type, add a
 * case in the game renderer below.
 */
export function GamePanel({ channelId }: GamePanelProps) {
  const dispatch = useAppDispatch();

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#1A1D2E] md:relative md:inset-auto md:z-auto md:w-72 md:border-l md:border-white/5 md:shrink-0">
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

      {/* Game renderer — add new game components here as needed */}
      <TicTacToeGame key={channelId} channelId={channelId} />
    </div>
  );
}
