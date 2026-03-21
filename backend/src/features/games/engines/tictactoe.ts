import * as z from "zod";
import { GameDifficulty } from "generated/prisma/client";
import { ConflictError, ForbiddenError } from "@common/errors";

export const MoveSchema = z.object({
  cellIndex: z.number().int().min(0).max(8),
});
export type Move = z.infer<typeof MoveSchema>;

export const StateSchema = z.object({
  board: z.array(z.string().nullable()),
});
export type TicTacToeState = z.infer<typeof StateSchema>;
export type Board = TicTacToeState["board"];

export const MAX_PLAYERS = 2;

export interface MoveResult {
  state: TicTacToeState;
  currentTurn: string; // next player's position as string ("1", "2", ...)
  winnerId: string | null;
  winnerLabel: string | null; // display name of winner, null = draw
  finished: boolean;
}

type Player = { position: number; user: { id: string; username: string } };

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkWinner(board: Board): string | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]!;
  }
  return null;
}

export function getWinLine(board: Board): [number, number, number] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line as [number, number, number];
    }
  }
  return null;
}

function isDraw(board: Board): boolean {
  return board.every((c) => c !== null) && !checkWinner(board);
}

function minimax(board: Board, isMaximizing: boolean, depth: number): number {
  const winner = checkWinner(board);
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (board.every((c) => c !== null)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) { board[i] = "O"; best = Math.max(best, minimax(board, false, depth + 1)); board[i] = null; }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) { board[i] = "X"; best = Math.min(best, minimax(board, true, depth + 1)); board[i] = null; }
    }
    return best;
  }
}

function getOptimalMove(board: Board): number {
  let bestScore = -Infinity, bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "O";
      const score = minimax(board, false, 0);
      board[i] = null;
      if (score > bestScore) { bestScore = score; bestMove = i; }
    }
  }
  return bestMove;
}

function getRandomMove(board: Board): number {
  const empty = board.map((c, i) => c === null ? i : -1).filter((i) => i !== -1);
  return empty[Math.floor(Math.random() * empty.length)];
}

function getBotMove(board: Board, difficulty: GameDifficulty): number {
  if (difficulty === "EASY") return getRandomMove(board);
  if (difficulty === "MEDIUM") return Math.random() < 0.5 ? getOptimalMove(board) : getRandomMove(board);
  return getOptimalMove(board);
}

// Position 1 = X, position 2 = O
const MARK_BY_POSITION: Record<number, string> = { 1: "X", 2: "O" };

export function initialState(): TicTacToeState {
  return { board: [null, null, null, null, null, null, null, null, null] };
}

export function applyMove(
  state: TicTacToeState,
  currentTurn: string,
  players: Player[],
  userId: string,
  move: unknown,
  vsBot: boolean,
  difficulty: GameDifficulty
): MoveResult {
  const parsed = MoveSchema.safeParse(move);
  if (!parsed.success) throw new ForbiddenError("Invalid move: cellIndex must be 0–8");
  const { cellIndex } = parsed.data;

  const player = players.find((p) => p.user.id === userId);
  if (!player) throw new ForbiddenError("You are not a player in this game");
  if (currentTurn !== String(player.position)) throw new ForbiddenError("It is not your turn");

  const mark = MARK_BY_POSITION[player.position] ?? "X";
  const board = state.board.slice();

  if (board[cellIndex] !== null) throw new ConflictError("That cell is already taken");
  board[cellIndex] = mark;

  const winner = checkWinner(board);
  const draw = !winner && isDraw(board);

  if (winner || draw) {
    return {
      state: { board },
      currentTurn,
      winnerId: winner ? userId : null,
      winnerLabel: winner ? player.user.username : null,
      finished: true,
    };
  }

  // Advance turn: cycle through player positions
  const positions = players.map((p) => p.position).sort((a, b) => a - b);
  const currentPos = player.position;
  const nextPos = positions[(positions.indexOf(currentPos) + 1) % positions.length];
  const nextTurn = String(nextPos);

  // Bot plays as position 2 (O)
  if (vsBot && nextPos === 2) {
    const botCell = getBotMove(board, difficulty);
    board[botCell] = "O";
    const botWinner = checkWinner(board);
    const botDraw = !botWinner && isDraw(board);
    return {
      state: { board },
      currentTurn: "1",
      winnerId: null,
      winnerLabel: botWinner ? "Bot" : null,
      finished: !!(botWinner || botDraw),
    };
  }

  return { state: { board }, currentTurn: nextTurn, winnerId: null, winnerLabel: null, finished: false };
}
