import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicTacToeBoard } from "./TicTacToeBoard";

const emptyBoard = Array(9).fill(null);

describe("TicTacToeBoard", () => {
  it("calls onCellClick with the correct index when an empty cell is clicked", async () => {
    const onCellClick = vi.fn();
    render(<TicTacToeBoard board={emptyBoard} disabled={false} onCellClick={onCellClick} />);

    const cells = screen.getAllByRole("button");
    await userEvent.pointer({ keys: "[MouseLeft]", target: cells[0] });

    expect(onCellClick).toHaveBeenCalledWith(0);
  });

  it("does not call onCellClick when board is disabled", async () => {
    const onCellClick = vi.fn();
    render(<TicTacToeBoard board={emptyBoard} disabled={true} onCellClick={onCellClick} />);

    const cells = screen.getAllByRole("button");
    await userEvent.click(cells[0]);

    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("does not call onCellClick on a filled cell", async () => {
    const onCellClick = vi.fn();
    const board = ["X", null, null, null, null, null, null, null, null];
    render(<TicTacToeBoard board={board} disabled={false} onCellClick={onCellClick} />);

    const cells = screen.getAllByRole("button");
    await userEvent.click(cells[0]);

    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("renders 9 cells", () => {
    render(<TicTacToeBoard board={emptyBoard} disabled={false} />);
    expect(screen.getAllByRole("button")).toHaveLength(9);
  });

  it("displays X and O in the correct cells", () => {
    const board = ["X", "O", null, null, null, null, null, null, null];
    render(<TicTacToeBoard board={board} disabled={false} />);
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("O")).toBeInTheDocument();
  });
});
