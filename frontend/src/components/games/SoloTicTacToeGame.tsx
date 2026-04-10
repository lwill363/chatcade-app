import { useState } from "react";
import { checkBoardWinner, getWinLine } from "@/features/games/tictactoe";
import { TicTacToeBoard } from "@/components/games/TicTacToeBoard";
import { useMakeMoveMutation, type Difficulty } from "@/features/games/gamesApi";
import { DIFFICULTY_META } from "@/features/games/games-config";
import type { Game } from "@/types";

const TTT_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="8" y1="2" x2="8" y2="22" />
    <line x1="16" y1="2" x2="16" y2="22" />
    <line x1="2" y1="8" x2="22" y2="8" />
    <line x1="2" y1="16" x2="22" y2="16" />
  </svg>
);

interface SoloTicTacToeGameProps {
  game: Game | null;
  isLoading: boolean;
  difficulty: Difficulty;
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
  onBack: () => void;
}

export function SoloTicTacToeGame({ game, isLoading, difficulty, onPlayAgain, onChangeDifficulty, onBack }: SoloTicTacToeGameProps) {
  const [makeMove, { isError: isMoveError }] = useMakeMoveMutation();
  const [pendingBoard, setPendingBoard] = useState<(string | null)[] | null>(null);

  const serverBoard = ((game?.state.board ?? Array(9).fill(null)) as (string | null)[]);
  const board = pendingBoard ?? serverBoard;
  const isFinished = game?.status === "FINISHED";
  const isActive = game?.status === "ACTIVE";
  const isBotThinking = pendingBoard !== null;
  const isMyTurn = isActive && game?.currentTurn === "1" && !isBotThinking;

  const boardWinner = checkBoardWinner(serverBoard);
  const winLine = isFinished && boardWinner ? getWinLine(serverBoard) : null;

  const resultText = (() => {
    if (!isFinished) return null;
    if (boardWinner === "X") return "You win!";
    if (boardWinner === "O") return "Bot wins!";
    return "It's a draw!";
  })();

  const statusText = (() => {
    if (isLoading) return "Loading...";
    if (resultText) return resultText;
    if (isBotThinking) return "Bot is thinking...";
    return "Your turn — you are X";
  })();

  const handleCellClick = async (cellIndex: number) => {
    if (!game) return;
    setPendingBoard(serverBoard.map((cell, idx) => idx === cellIndex ? "X" : cell));
    try {
      await makeMove({ gameId: game.id, move: { cellIndex } }).unwrap();
      await new Promise<void>((resolve) => setTimeout(resolve, 700));
    } finally {
      setPendingBoard(null);
    }
  };

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
        isBotThinking ? "text-dim" : "text-foreground"
      }`}>
        {statusText}
      </p>

      <div className="mx-auto">
        <TicTacToeBoard
          board={board}
          disabled={!isMyTurn}
          onCellClick={(i) => void handleCellClick(i)}
          winLine={winLine}
          size="lg"
        />
      </div>

      {isMoveError && (
        <p className="text-red-400 text-xs text-center">Move failed — please try again.</p>
      )}

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
