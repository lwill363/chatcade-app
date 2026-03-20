import { useState } from "react";
import {
  useGetActiveSoloGameQuery,
  useCreateSoloGameMutation,
  useMakeMoveMutation,
  useForfeitGameMutation,
  type Difficulty,
} from "@/features/games/gamesApi";
import { checkBoardWinner, getWinLine } from "@/features/games/tictactoe";
import { TicTacToeBoard } from "@/components/games/TicTacToeBoard";
import type { Game } from "@/types";

type Screen = "info" | "difficulty" | "playing";

const DIFFICULTY_META: Record<Difficulty, { label: string; description: string; badge: string }> = {
  EASY:   { label: "Easy",   description: "Bot plays randomly — you can definitely win!", badge: "bg-green-500/15 text-green-400" },
  MEDIUM: { label: "Medium", description: "Bot plays optimally about half the time.",       badge: "bg-yellow-500/15 text-yellow-400" },
  HARD:   { label: "Hard",   description: "Perfect play — best you can do is a draw.",      badge: "bg-red-500/15 text-red-400" },
};

const TTT_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="8" y1="2" x2="8" y2="22" />
    <line x1="16" y1="2" x2="16" y2="22" />
    <line x1="2" y1="8" x2="22" y2="8" />
    <line x1="2" y1="16" x2="22" y2="16" />
  </svg>
);

export function GamesView() {
  const [screen, setScreen] = useState<Screen>("info");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");

  const { data: game, isLoading } = useGetActiveSoloGameQuery(undefined, {
    skip: screen === "info" || screen === "difficulty",
  });

  const [createSoloGame, { isLoading: isCreating }] = useCreateSoloGameMutation();
  const [makeMove, { isLoading: isMoving }] = useMakeMoveMutation();
  const [forfeitGame] = useForfeitGameMutation();

  const startGame = async () => {
    await createSoloGame({ difficulty });
    setScreen("playing");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-8">
      <h2
        className="text-foreground text-2xl font-extrabold mb-1"
        style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic" }}
      >
        Games
      </h2>
      <p className="text-muted text-sm mb-8">
        Play minigames with friends in any channel, or solo against the bot here.
      </p>

      {screen === "info" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TicTacToeInfoCard onPlay={() => setScreen("difficulty")} />
          <ComingSoonCard title="Chess" description="Full board chess with timers. Coming later." icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 22H5v-2h14v2M9 6.2V3h6v3.2l2 2.8h-2v5h-2v-5h-.5v5H10.5v-5H9l2-2.8z" /></svg>} />
          <ComingSoonCard title="Word Scramble" description="Race to unscramble words before your opponent." icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" /></svg>} />
        </div>
      )}

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
              <button onClick={() => setScreen("info")} className="flex-1 py-2 rounded-xl bg-[#2A2D42] hover:bg-[#363A55] text-foreground text-sm cursor-pointer transition-colors">
                Back
              </button>
              <button onClick={() => void startGame()} disabled={isCreating} className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm cursor-pointer transition-colors disabled:opacity-50">
                {isCreating ? "Starting..." : "Start Game"}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "playing" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <SoloGameBoard
            game={game ?? null}
            isLoading={isLoading}
            isMoving={isMoving}
            difficulty={difficulty}
            onMove={(cellIndex) => game && void makeMove({ gameId: game.id, move: { cellIndex } })}
            onPlayAgain={() => void startGame()}
            onChangeDifficulty={() => {
              if (game && game.status === "ACTIVE") void forfeitGame({ gameId: game.id });
              setScreen("difficulty");
            }}
            onBack={() => {
              if (game && game.status === "ACTIVE") void forfeitGame({ gameId: game.id });
              setScreen("info");
            }}
          />
          <div className="flex flex-col gap-4">
            <div className="bg-surface rounded-2xl border border-white/8 p-5">
              <p className="text-dim text-[11px] font-semibold uppercase tracking-wider mb-3">Play in a channel</p>
              <p className="text-muted text-sm leading-relaxed">
                Type <span className="font-mono text-primary text-xs">/tictactoe</span> in any channel to challenge a friend. Your invite appears in chat and they click Join to start.
              </p>
            </div>
            <ComingSoonCard title="Chess" description="Full board chess with timers." icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 22H5v-2h14v2M9 6.2V3h6v3.2l2 2.8h-2v5h-2v-5h-.5v5H10.5v-5H9l2-2.8z" /></svg>} />
            <ComingSoonCard title="Word Scramble" description="Race to unscramble words before your opponent." icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" /></svg>} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── TicTacToe info card ───────────────────────────────────────────────────────

function TicTacToeInfoCard({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="bg-surface rounded-2xl border border-white/8 p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#1A1D2E] border border-white/8 flex items-center justify-center text-primary shrink-0">
          {TTT_ICON}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-foreground font-bold text-base">Tic-Tac-Toe</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">Available</span>
          </div>
          <p className="text-muted text-xs mt-0.5 leading-relaxed">Classic 3×3 strategy game. Challenge a friend in a channel or go up against the bot here.</p>
        </div>
      </div>
      <div className="border-t border-white/5 pt-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="text-dim text-[11px] font-semibold uppercase tracking-wider mb-1">How to play</p>
          <p className="text-muted text-xs leading-relaxed">Type <span className="font-mono text-primary">/tictactoe</span> in any channel to challenge someone. Your invite appears in chat — they click Join to accept and the game begins.</p>
        </div>
        <div>
          <p className="text-dim text-[11px] font-semibold uppercase tracking-wider mb-1.5">Rules</p>
          <ul className="flex flex-col gap-1">
            {["Players take turns placing X or O on a 3×3 board.", "First to get three in a row wins.", "If all 9 squares are filled with no winner, it's a draw.", "One active game per channel at a time."].map((r) => (
              <li key={r} className="flex gap-2 text-xs text-muted"><span className="text-primary mt-0.5 shrink-0">›</span>{r}</li>
            ))}
          </ul>
        </div>
      </div>
      <button onClick={onPlay} className="w-full py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm cursor-pointer transition-colors mt-auto">
        Play vs Bot
      </button>
    </div>
  );
}

// ── Solo game board ───────────────────────────────────────────────────────────

interface SoloGameBoardProps {
  game: Game | null;
  isLoading: boolean;
  isMoving: boolean;
  difficulty: Difficulty;
  onMove: (cellIndex: number) => void;
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
  onBack: () => void;
}

function SoloGameBoard({ game, isLoading, isMoving, difficulty, onMove, onPlayAgain, onChangeDifficulty, onBack }: SoloGameBoardProps) {
  const board = ((game?.state.board ?? Array(9).fill(null)) as (string | null)[]);
  const isFinished = game?.status === "FINISHED";
  const isActive = game?.status === "ACTIVE";
  // currentTurn "1" = player (X), "2" = bot (O)
  const isMyTurn = isActive && game?.currentTurn === "1" && !isMoving;

  const boardWinner = checkBoardWinner(board);
  const winLine = isFinished && boardWinner ? getWinLine(board) : null;

  const resultText = (() => {
    if (!isFinished) return null;
    if (boardWinner === "X") return "You win!";
    if (boardWinner === "O") return "Bot wins!";
    return "It's a draw!";
  })();

  const statusText = (() => {
    if (isLoading) return "Loading...";
    if (resultText) return resultText;
    if (isMoving || game?.currentTurn === "2") return "Bot is thinking...";
    return "Your turn — you are X";
  })();

  return (
    <div className="bg-surface rounded-2xl border border-white/8 p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1D2E] border border-white/8 flex items-center justify-center text-primary shrink-0">
            {TTT_ICON}
          </div>
          <div>
            <h3 className="text-foreground font-bold text-base">Tic-Tac-Toe</h3>
            <p className="text-muted text-xs mt-0.5">You are X — bot plays O</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${DIFFICULTY_META[difficulty].badge}`}>
          {DIFFICULTY_META[difficulty].label}
        </span>
      </div>

      <p className={`text-sm font-medium text-center ${
        resultText === "You win!" ? "text-primary" :
        resultText === "Bot wins!" ? "text-red-400" :
        resultText ? "text-muted" :
        isMoving || game?.currentTurn === "O" ? "text-dim" : "text-foreground"
      }`}>
        {statusText}
      </p>

      <div className="mx-auto">
        <TicTacToeBoard
          board={board}
          disabled={!isMyTurn}
          onCellClick={onMove}
          winLine={winLine}
          size="lg"
        />
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {isFinished ? (
          <>
            <button onClick={onPlayAgain} className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm cursor-pointer transition-colors">
              Play Again
            </button>
            <button onClick={onChangeDifficulty} className="px-5 py-2 rounded-xl bg-[#2A2D42] hover:bg-[#363A55] text-foreground text-sm cursor-pointer transition-colors">
              Change Difficulty
            </button>
          </>
        ) : (
          <button onClick={onBack} className="text-xs text-dim hover:text-muted cursor-pointer">
            ← Back to games
          </button>
        )}
      </div>
    </div>
  );
}

// ── Coming soon card ──────────────────────────────────────────────────────────

function ComingSoonCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
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
