import { describe, it, expect } from "vitest";
import { getApiErrorMessage } from "./index";

describe("getApiErrorMessage", () => {
  it("extracts message from a well-formed API error", () => {
    const error = { data: { message: "Username is already taken", code: 409, error: "Conflict" } };
    expect(getApiErrorMessage(error)).toBe("Username is already taken");
  });

  it("returns undefined when error is null", () => {
    expect(getApiErrorMessage(null)).toBeUndefined();
  });

  it("returns undefined when error has no data property", () => {
    expect(getApiErrorMessage({ status: 500 })).toBeUndefined();
  });

  it("returns undefined when data.message is not a string", () => {
    expect(getApiErrorMessage({ data: { message: 42 } })).toBeUndefined();
  });

  it("returns undefined when data is null", () => {
    expect(getApiErrorMessage({ data: null })).toBeUndefined();
  });
});
