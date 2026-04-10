import { useState, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { selectChannel, setActiveView } from "@/features/ui/uiSlice";
import { useListChannelsQuery } from "@/features/channels/channelsApi";
import {
  useGetActiveChannelGamesQuery,
  useGetActiveSoloGameQuery,
  useCreateSoloGameMutation,
  type Difficulty,
} from "@/features/games/gamesApi";
import { Spinner } from "@/components/ui/Spinner";
import { SoloTicTacToeGame } from "@/components/games/SoloTicTacToeGame";
import { DIFFICULTY_META } from "@/features/games/games-config";

type Screen = "hub" | "difficulty" | "playing";

const TTT_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="8" y1="2" x2="8" y2="22" />
    <line x1="16" y1="2" x2="16" y2="22" />
    <line x1="2" y1="8" x2="22" y2="8" />
    <line x1="2" y1="16" x2="22" y2="16" />
  </svg>
);

export function GamesView() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [screen, setScreen] = useState<Screen>("hub");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");

  const { data: channelGames = [], isLoading: isLoadingChannelGames } = useGetActiveChannelGamesQuery();
  const { data: channels = [] } = useListChannelsQuery(undefined);
  const { data: soloGame, isLoading: isSoloLoading } = useGetActiveSoloGameQuery();

  const [createSoloGame, { isLoading: isCreating }] = useCreateSoloGameMutation();

  const hasActiveSoloGame = soloGame != null && soloGame.status !== "FINISHED";

  const startGame = async () => {
    await createSoloGame({ difficulty });
    setScreen("playing");
  };

  const handleJumpToChannel = (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return;
    dispatch(selectChannel(channel));
    dispatch(setActiveView("chat"));
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 p-8 ${screen === "playing" ? "overflow-hidden" : "overflow-y-auto"}`}>
      <h2
        className="text-foreground text-2xl font-extrabold mb-1"
        style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic" }}
      >
        Games
      </h2>
      <p className="text-muted text-sm mb-8">
        Play minigames with friends in any channel, or solo against the bot.
      </p>

      {/* ── Active channel games ─────────────────────────────────────────────── */}
      {(isLoadingChannelGames || channelGames.length > 0) && screen === "hub" && (
        <section className="mb-8">
          <p className="text-dim text-[11px] font-semibold uppercase tracking-wider mb-3">Active in channels</p>
          {isLoadingChannelGames ? (
            <div className="flex items-center gap-2 text-dim text-sm">
              <Spinner size="sm" /> Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {channelGames.map((game) => {
                const channel = channels.find((c) => c.id === game.channelId);
                const channelName = channel
                  ? channel.type === "DM" ? channel.partnerUsername : channel.name
                  : "Unknown channel";
                const myPlayer = game.players.find((p) => p.user.id === currentUser?.id);
                const opponent = game.players.find((p) => p.user.id !== currentUser?.id);
                const isMyTurn = game.status === "ACTIVE" && myPlayer && game.currentTurn === String(myPlayer.position);

                return (
                  <button
                    key={game.id}
                    onClick={() => game.channelId && handleJumpToChannel(game.channelId)}
                    className="bg-surface rounded-2xl border border-white/8 p-4 flex flex-col gap-3 text-left hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#1A1D2E] border border-white/8 flex items-center justify-center text-primary shrink-0">
                          {TTT_ICON}
                        </div>
                        <div>
                          <p className="text-foreground text-sm font-bold leading-tight">Tic-Tac-Toe</p>
                          <p className="text-dim text-xs">#{channelName}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0 ${
                        game.status === "WAITING"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : isMyTurn
                          ? "bg-primary/15 text-primary"
                          : "bg-white/5 text-dim"
                      }`}>
                        {game.status === "WAITING" ? "Waiting" : isMyTurn ? "Your turn" : "Their turn"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted">
                      {game.players.map((p, i) => (
                        <span key={p.user.id}>
                          {i > 0 && <span className="text-dim mx-1">vs</span>}
                          <span className={p.user.id === currentUser?.id ? "text-primary font-semibold" : "text-foreground"}>
                            {p.user.id === currentUser?.id ? "You" : p.user.username}
                          </span>
                        </span>
                      ))}
                      {game.status === "WAITING" && !opponent && (
                        <span className="text-dim italic">waiting for opponent...</span>
                      )}
                    </div>

                    <p className="text-dim text-xs">Click to go to channel →</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Solo play ────────────────────────────────────────────────────────── */}
      {screen === "hub" && (
        <section>
          <p className="text-dim text-[11px] font-semibold uppercase tracking-wider mb-3">Solo play</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <TicTacToeInfoCard
              hasActiveGame={hasActiveSoloGame}
              onResume={() => setScreen("playing")}
              onPlay={() => setScreen("difficulty")}
            />
            <ComingSoonCard title="Chess" description="Full board chess with timers. Coming later." icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 22H5v-2h14v2M9 6.2V3h6v3.2l2 2.8h-2v5h-2v-5h-.5v5H10.5v-5H9l2-2.8z" /></svg>} />
            <ComingSoonCard title="Word Scramble" description="Race to unscramble words before your opponent." icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" /></svg>} />
          </div>
        </section>
      )}

      {/* ── Difficulty picker ─────────────────────────────────────────────────── */}
      {screen === "difficulty" && (
        <div className="max-w-sm">
          <div className="bg-surface rounded-2xl border border-white/8 p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A1D2E] border border-white/8 flex items-center justify-center text-primary shrink-0">
                {TTT_ICON}
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Tic-Tac-Toe</h3>
                <p className="text-muted text-xs mt-0.5">Choose a difficulty to begin</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left cursor-pointer transition-colors ${
                    difficulty === d ? "border-primary/50 bg-primary/10" : "border-white/8 bg-[#1A1D2E] hover:bg-[#2E3147]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${difficulty === d ? "border-primary" : "border-white/20"}`}>
                    {difficulty === d && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${difficulty === d ? "text-primary" : "text-foreground"}`}>
                      {DIFFICULTY_META[d].label}
                    </p>
                    <p className="text-dim text-xs">{DIFFICULTY_META[d].description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setScreen("hub")} className="flex-1 py-2 rounded-xl bg-[#2A2D42] hover:bg-[#363A55] text-foreground text-sm cursor-pointer transition-colors">
                Back
              </button>
              <button onClick={() => void startGame()} disabled={isCreating} className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm cursor-pointer transition-colors disabled:opacity-50">
                {isCreating ? "Starting..." : "Start Game"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Solo game ─────────────────────────────────────────────────────────── */}
      {screen === "playing" && (
        <SoloTicTacToeGame
          game={soloGame ?? null}
          isLoading={isSoloLoading}
          difficulty={difficulty}
          onPlayAgain={() => void startGame()}
          onChangeDifficulty={() => setScreen("difficulty")}
          onBack={() => setScreen("hub")}
        />
      )}
    </div>
  );
}

// ── TicTacToe info card ───────────────────────────────────────────────────────

const LARGE_TTT_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="8" y1="2" x2="8" y2="22" />
    <line x1="16" y1="2" x2="16" y2="22" />
    <line x1="2" y1="8" x2="22" y2="8" />
    <line x1="2" y1="16" x2="22" y2="16" />
  </svg>
);

function TicTacToeInfoCard({ hasActiveGame, onResume, onPlay }: { hasActiveGame: boolean; onResume: () => void; onPlay: () => void }) {
  return (
    <div className="bg-surface rounded-2xl border border-white/8 p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#1A1D2E] border border-white/8 flex items-center justify-center text-primary shrink-0">
          {LARGE_TTT_ICON}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-foreground font-bold text-base">Tic-Tac-Toe</h3>
            {hasActiveGame
              ? <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400">In progress</span>
              : <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">Available</span>
            }
          </div>
          <p className="text-muted text-xs mt-0.5 leading-relaxed">Classic 3×3 strategy game. Play against the bot here or challenge a friend with <span className="font-mono text-primary">/tictactoe</span> in any channel.</p>
        </div>
      </div>
      {hasActiveGame ? (
        <div className="flex gap-2 mt-auto">
          <button onClick={onResume} className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm cursor-pointer transition-colors">
            Resume Game
          </button>
          <button onClick={onPlay} className="px-4 py-2 rounded-xl bg-[#2A2D42] hover:bg-[#363A55] text-foreground text-sm cursor-pointer transition-colors">
            New Game
          </button>
        </div>
      ) : (
        <button onClick={onPlay} className="w-full py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm cursor-pointer transition-colors mt-auto">
          Play vs Bot
        </button>
      )}
    </div>
  );
}

// ── Coming soon card ──────────────────────────────────────────────────────────

function ComingSoonCard({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl border border-white/5 p-5 flex flex-col gap-3 opacity-50">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#1A1D2E] border border-white/5 flex items-center justify-center text-dim shrink-0">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-secondary font-bold text-base">{title}</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-white/5 text-dim">Soon</span>
          </div>
          <p className="text-dim text-xs mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
