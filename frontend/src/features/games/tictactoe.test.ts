import { describe, it, expect } from "vitest";
import { checkBoardWinner, getWinLine } from "./tictactoe";

const empty = (): (string | null)[] => Array(9).fill(null);

describe("checkBoardWinner", () => {
  it("returns null for an empty board", () => {
    expect(checkBoardWinner(empty())).toBeNull();
  });

  it("returns null for an in-progress board with no winner", () => {
    expect(checkBoardWinner(["X", null, "O", null, null, null, null, null, null])).toBeNull();
  });

  it("returns null for a full draw board", () => {
    // X O X / O X O / O X O — no three in a row
    expect(checkBoardWinner(["X", "O", "X", "O", "X", "O", "O", "X", "O"])).toBeNull();
  });

  it("detects top row win for X", () => {
    expect(checkBoardWinner(["X", "X", "X", null, null, null, null, null, null])).toBe("X");
  });

  it("detects middle row win for O", () => {
    expect(checkBoardWinner([null, null, null, "O", "O", "O", null, null, null])).toBe("O");
  });

  it("detects bottom row win for X", () => {
    expect(checkBoardWinner([null, null, null, null, null, null, "X", "X", "X"])).toBe("X");
  });

  it("detects left column win", () => {
    expect(checkBoardWinner(["O", null, null, "O", null, null, "O", null, null])).toBe("O");
  });

  it("detects middle column win", () => {
    expect(checkBoardWinner([null, "X", null, null, "X", null, null, "X", null])).toBe("X");
  });

  it("detects right column win", () => {
    expect(checkBoardWinner([null, null, "O", null, null, "O", null, null, "O"])).toBe("O");
  });

  it("detects top-left to bottom-right diagonal win", () => {
    expect(checkBoardWinner(["X", null, null, null, "X", null, null, null, "X"])).toBe("X");
  });

  it("detects top-right to bottom-left diagonal win", () => {
    expect(checkBoardWinner([null, null, "O", null, "O", null, "O", null, null])).toBe("O");
  });
});

describe("getWinLine", () => {
  it("returns null when there is no winner", () => {
    expect(getWinLine(empty())).toBeNull();
  });

  it("returns null for a draw", () => {
    expect(getWinLine(["X", "O", "X", "O", "X", "O", "O", "X", "O"])).toBeNull();
  });

  it("returns [0,1,2] for top row", () => {
    expect(getWinLine(["X", "X", "X", null, null, null, null, null, null])).toEqual([0, 1, 2]);
  });

  it("returns [3,4,5] for middle row", () => {
    expect(getWinLine([null, null, null, "O", "O", "O", null, null, null])).toEqual([3, 4, 5]);
  });

  it("returns [6,7,8] for bottom row", () => {
    expect(getWinLine([null, null, null, null, null, null, "X", "X", "X"])).toEqual([6, 7, 8]);
  });

  it("returns [0,3,6] for left column", () => {
    expect(getWinLine(["O", null, null, "O", null, null, "O", null, null])).toEqual([0, 3, 6]);
  });

  it("returns [1,4,7] for middle column", () => {
    expect(getWinLine([null, "X", null, null, "X", null, null, "X", null])).toEqual([1, 4, 7]);
  });

  it("returns [2,5,8] for right column", () => {
    expect(getWinLine([null, null, "O", null, null, "O", null, null, "O"])).toEqual([2, 5, 8]);
  });

  it("returns [0,4,8] for the main diagonal", () => {
    expect(getWinLine(["X", null, null, null, "X", null, null, null, "X"])).toEqual([0, 4, 8]);
  });

  it("returns [2,4,6] for the anti-diagonal", () => {
    expect(getWinLine([null, null, "O", null, "O", null, "O", null, null])).toEqual([2, 4, 6]);
  });
});
