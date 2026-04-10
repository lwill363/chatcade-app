import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/app/hooks";
import {
  useGetActiveGameQuery,
  useCreateGameMutation,
  useJoinGameMutation,
  useMakeMoveMutation,
  useForfeitGameMutation,
} from "@/features/games/gamesApi";
import { getWinLine } from "@/features/games/tictactoe";
import { TicTacToeBoard } from "@/components/games/TicTacToeBoard";

// TicTacToe convention: position 1 = X, position 2 = O
const MARK = (position: number) => position === 1 ? "X" : "O";

interface TicTacToeGameProps {
  channelId: string;
}

export function TicTacToeGame({ channelId }: TicTacToeGameProps) {
  const currentUser = useAppSelector((s) => s.auth.user);

  const { data: game, isLoading } = useGetActiveGameQuery({ channelId });

  const [createGame, { isLoading: isCreating }] = useCreateGameMutation();
  const [joinGame, { isLoading: isJoining }] = useJoinGameMutation();
  const [makeMove, { isLoading: isMoving, isError: isMoveError }] = useMakeMoveMutation();
  const [forfeitGame, { isLoading: isForfeiting }] = useForfeitGameMutation();
  const [pendingBoard, setPendingBoard] = useState<(string | null)[] | null>(null);

  const gameRef = useRef(game);
  const forfeitRef = useRef(forfeitGame);
  const userRef = useRef(currentUser);
  gameRef.current = game;
  forfeitRef.current = forfeitGame;
  userRef.current = currentUser;

  useEffect(() => {
    return () => {
      const g = gameRef.current;
      const user = userRef.current;
      const myPlayer = g?.players.find((p) => p.user.id === user?.id);
      if (g?.status === "WAITING" && myPlayer?.position === 1) {
        void forfeitRef.current({ gameId: g.id, channelId });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="text-dim text-sm">Loading game...</span>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-muted text-sm font-medium">Challenge someone to Tic-Tac-Toe</p>
        <button
          onClick={() => void createGame({ channelId, vsBot: false })}
          disabled={isCreating}
          className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          Start Game
        </button>
      </div>
    );
  }

  const serverBoard = (game.state.board ?? []) as (string | null)[];
  const board = pendingBoard ?? serverBoard;
  const myPlayer = game.players.find((p) => p.user.id === currentUser?.id);
  const isParticipant = !!myPlayer;
  const isBotThinking = game.vsBot && (isMoving || pendingBoard !== null);
  const isMyTurn = isParticipant && game.status === "ACTIVE" &&
    game.currentTurn === String(myPlayer.position) && !isBotThinking;

  const handleCellClick = async (i: number) => {
    if (!myPlayer) return;
    if (game.vsBot) {
      const mark = myPlayer.position === 1 ? "X" : "O";
      setPendingBoard(serverBoard.map((cell, idx) => idx === i ? mark : cell));
      try {
        await makeMove({ gameId: game.id, channelId, move: { cellIndex: i } }).unwrap();
        await new Promise<void>((resolve) => setTimeout(resolve, 700));
      } finally {
        setPendingBoard(null);
      }
    } else {
      void makeMove({ gameId: game.id, channelId, move: { cellIndex: i } });
    }
  };

  const player1 = game.players.find((p) => p.position === 1);
  const player2 = game.players.find((p) => p.position === 2);

  if (game.status === "WAITING") {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-muted text-sm">
          <span className="font-semibold text-foreground">{player1?.user.username}</span> started a game
        </p>
        {myPlayer?.position !== 1 ? (
          <button
            onClick={() => void joinGame({ gameId: game.id, channelId })}
            disabled={isJoining}
            className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            Join Game
          </button>
        ) : (
          <>
            <p className="text-dim text-sm italic">Waiting for an opponent to join...</p>
            <button
              onClick={() => void forfeitGame({ gameId: game.id, channelId })}
              disabled={isForfeiting}
              className="text-xs text-dim hover:text-red-400 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    );
  }

  if (game.status === "FINISHED") {
    const winLine = game.winner ? getWinLine(board) : null;
    const resultText = game.winner ? `${game.winner.username} wins!` : "It's a draw!";
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-sm font-bold text-foreground">{resultText}</p>
        <TicTacToeBoard board={board} disabled winLine={winLine} />
        {isParticipant && (
          <button
            onClick={() => void createGame({ channelId, vsBot: false })}
            disabled={isCreating}
            className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer mt-1"
          >
            Play Again
          </button>
        )}
      </div>
    );
  }

  // Active game
  const turnPlayer = game.players.find((p) => String(p.position) === game.currentTurn);
  const turnLabel = isBotThinking
    ? "Bot is thinking..."
    : isMyTurn
    ? "Your turn"
    : `${turnPlayer?.user.username ?? "Opponent"}'s turn`;

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center gap-4 text-xs text-muted">
        <span>
          <span className="font-bold text-foreground">{player1?.user.username ?? "?"}</span>{" "}
          ({MARK(1)})
        </span>
        <span className="text-dim">vs</span>
        <span>
          <span className="font-bold text-foreground">{player2?.user.username ?? "?"}</span>{" "}
          ({MARK(2)})
        </span>
      </div>

      <p className={`text-xs font-medium ${isMyTurn ? "text-primary" : "text-dim"}`}>
        {turnLabel}
      </p>

      {isMoveError && (
        <p className="text-red-400 text-xs text-center">Failed to make move. Please try again.</p>
      )}

      <TicTacToeBoard
        board={board}
        disabled={!isMyTurn}
        onCellClick={(i) => void handleCellClick(i)}
      />

      {isParticipant && (
        <button
          onClick={() => {
            if (confirm("Forfeit this game?")) void forfeitGame({ gameId: game.id, channelId });
          }}
          disabled={isForfeiting}
          className="text-xs text-dim hover:text-red-400 cursor-pointer disabled:opacity-50 mt-1"
        >
          Forfeit
        </button>
      )}
    </div>
  );
}
