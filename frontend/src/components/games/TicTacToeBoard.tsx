interface TicTacToeBoardProps {
  board: (string | null)[];
  disabled: boolean;
  onCellClick?: (index: number) => void;
  winLine?: [number, number, number] | null;
  size?: "sm" | "lg";
}

export function TicTacToeBoard({ board, disabled, onCellClick, winLine, size = "sm" }: TicTacToeBoardProps) {
  return (
    <div data-testid="tictactoe-board" className={`grid grid-cols-3 ${size === "lg" ? "gap-2" : "gap-1.5"}`}>
      {board.map((cell, i) => {
        const isWin = winLine?.includes(i) ?? false;
        const isEmpty = cell === null;
        return (
          <button
            key={i}
            onClick={() => onCellClick?.(i)}
            disabled={disabled || !isEmpty}

            className={`
              ${size === "lg" ? "w-20 h-20 text-2xl" : "w-14 h-14 text-xl"}
              rounded-xl font-bold flex items-center justify-center transition-all
              ${cell === "X"
                ? isWin
                  ? "text-primary bg-primary/10 border border-primary/40"
                  : "text-primary bg-[#1A1D2E] border border-white/8"
                : cell === "O"
                ? isWin
                  ? "text-[#a78bfa] bg-[#a78bfa]/10 border border-[#a78bfa]/40"
                  : "text-[#a78bfa] bg-[#1A1D2E] border border-white/8"
                : !disabled
                ? "bg-[#1A1D2E] hover:bg-[#2E3147] cursor-pointer border border-white/10"
                : "bg-[#1A1D2E] border border-white/5 cursor-default"}
            `}
          >
            {isEmpty ? (size === "sm" ? "·" : "") : cell}
          </button>
        );
      })}
    </div>
  );
}
