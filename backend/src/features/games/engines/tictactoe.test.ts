import { describe, it, expect } from "vitest";
import { ConflictError, ForbiddenError } from "@common/errors";
import { initialState, checkWinner, getWinLine, applyMove } from "./tictactoe";

const PLAYER_1 = { position: 1, user: { id: "u1", username: "alice" } };
const PLAYER_2 = { position: 2, user: { id: "u2", username: "bob" } };
const PLAYERS = [PLAYER_1, PLAYER_2];

describe("initialState", () => {
  it("returns a board of 9 nulls", () => {
    const state = initialState();
    expect(state.board).toHaveLength(9);
    expect(state.board.every((c) => c === null)).toBe(true);
  });
});

describe("checkWinner", () => {
  it("returns null on an empty board", () => {
    expect(checkWinner(Array(9).fill(null))).toBeNull();
  });

  it("detects a top row win", () => {
    expect(checkWinner(["X", "X", "X", null, null, null, null, null, null])).toBe("X");
  });

  it("detects a middle row win", () => {
    expect(checkWinner([null, null, null, "O", "O", "O", null, null, null])).toBe("O");
  });

  it("detects a bottom row win", () => {
    expect(checkWinner([null, null, null, null, null, null, "X", "X", "X"])).toBe("X");
  });

  it("detects a column win", () => {
    expect(checkWinner(["O", null, null, "O", null, null, "O", null, null])).toBe("O");
  });

  it("detects the top-left to bottom-right diagonal", () => {
    expect(checkWinner(["X", null, null, null, "X", null, null, null, "X"])).toBe("X");
  });

  it("detects the top-right to bottom-left diagonal", () => {
    expect(checkWinner([null, null, "O", null, "O", null, "O", null, null])).toBe("O");
  });

  it("returns null for a draw (full board, no winner)", () => {
    // X O X / O X O / O X O
    expect(checkWinner(["X", "O", "X", "O", "X", "O", "O", "X", "O"])).toBeNull();
  });

  it("returns null for an in-progress board", () => {
    expect(checkWinner(["X", null, "O", null, null, null, null, null, null])).toBeNull();
  });
});

describe("getWinLine", () => {
  it("returns null when there is no winner", () => {
    expect(getWinLine(Array(9).fill(null))).toBeNull();
  });

  it("returns row win line [0,1,2]", () => {
    expect(getWinLine(["X", "X", "X", null, null, null, null, null, null])).toEqual([0, 1, 2]);
  });

  it("returns row win line [3,4,5]", () => {
    expect(getWinLine([null, null, null, "O", "O", "O", null, null, null])).toEqual([3, 4, 5]);
  });

  it("returns column win line [0,3,6]", () => {
    expect(getWinLine(["X", null, null, "X", null, null, "X", null, null])).toEqual([0, 3, 6]);
  });

  it("returns diagonal win line [0,4,8]", () => {
    expect(getWinLine(["O", null, null, null, "O", null, null, null, "O"])).toEqual([0, 4, 8]);
  });

  it("returns diagonal win line [2,4,6]", () => {
    expect(getWinLine([null, null, "X", null, "X", null, "X", null, null])).toEqual([2, 4, 6]);
  });
});

describe("applyMove", () => {
  it("throws ForbiddenError for a missing cellIndex", () => {
    expect(() =>
      applyMove(initialState(), "1", PLAYERS, "u1", { foo: "bar" }, false, "HARD")
    ).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when cellIndex is out of range", () => {
    expect(() =>
      applyMove(initialState(), "1", PLAYERS, "u1", { cellIndex: 9 }, false, "HARD")
    ).toThrow(ForbiddenError);

    expect(() =>
      applyMove(initialState(), "1", PLAYERS, "u1", { cellIndex: -1 }, false, "HARD")
    ).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when user is not a player", () => {
    expect(() =>
      applyMove(initialState(), "1", PLAYERS, "unknown", { cellIndex: 0 }, false, "HARD")
    ).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError when it is not the user's turn", () => {
    expect(() =>
      applyMove(initialState(), "2", PLAYERS, "u1", { cellIndex: 0 }, false, "HARD")
    ).toThrow(ForbiddenError);
  });

  it("throws ConflictError when the cell is already taken", () => {
    const state = { board: ["X", null, null, null, null, null, null, null, null] };
    expect(() =>
      applyMove(state, "1", PLAYERS, "u1", { cellIndex: 0 }, false, "HARD")
    ).toThrow(ConflictError);
  });

  it("places X for player 1 and advances the turn", () => {
    const result = applyMove(initialState(), "1", PLAYERS, "u1", { cellIndex: 0 }, false, "HARD");
    expect(result.state.board[0]).toBe("X");
    expect(result.currentTurn).toBe("2");
    expect(result.finished).toBe(false);
  });

  it("places O for player 2 and advances the turn", () => {
    const state = { board: ["X", null, null, null, null, null, null, null, null] };
    const result = applyMove(state, "2", PLAYERS, "u2", { cellIndex: 1 }, false, "HARD");
    expect(result.state.board[1]).toBe("O");
    expect(result.currentTurn).toBe("1");
    expect(result.finished).toBe(false);
  });

  it("detects a win for player 1", () => {
    // X X _ / O O _ / _ _ _ — player 1 completes row 0
    const state = { board: ["X", "X", null, "O", "O", null, null, null, null] };
    const result = applyMove(state, "1", PLAYERS, "u1", { cellIndex: 2 }, false, "HARD");
    expect(result.finished).toBe(true);
    expect(result.winnerId).toBe("u1");
    expect(result.winnerLabel).toBe("alice");
  });

  it("detects a draw", () => {
    // X O X / O X O / O X _ — O fills last cell, no winner
    const state = { board: ["X", "O", "X", "O", "X", "O", "O", "X", null] };
    const result = applyMove(state, "2", PLAYERS, "u2", { cellIndex: 8 }, false, "HARD");
    expect(result.finished).toBe(true);
    expect(result.winnerId).toBeNull();
    expect(result.winnerLabel).toBeNull();
  });

  it("applies the bot move immediately after the player in vsBot mode", () => {
    const result = applyMove(initialState(), "1", PLAYERS, "u1", { cellIndex: 4 }, true, "HARD");
    const oCount = result.state.board.filter((c) => c === "O").length;
    expect(oCount).toBeGreaterThanOrEqual(1);
    // Turn returns to player 1
    expect(result.currentTurn).toBe("1");
  });

  it("does not mutate the original state", () => {
    const state = initialState();
    applyMove(state, "1", PLAYERS, "u1", { cellIndex: 0 }, false, "HARD");
    expect(state.board[0]).toBeNull();
  });
});
