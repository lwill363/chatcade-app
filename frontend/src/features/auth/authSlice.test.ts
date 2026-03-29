import { describe, it, expect } from "vitest";
import reducer, { setCredentials, setUser, doneBootstrapping, logout } from "./authSlice";
import { makeUser } from "@/test/factories";

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isBootstrapping: false,
};

const mockUser = makeUser();

describe("authSlice", () => {
  describe("setCredentials", () => {
    it("stores access and refresh tokens", () => {
      const state = reducer(
        initialState,
        setCredentials({ accessToken: "acc-token", refreshToken: "ref-token" })
      );

      expect(state.accessToken).toBe("acc-token");
      expect(state.refreshToken).toBe("ref-token");
    });
  });

  describe("setUser", () => {
    it("stores the authenticated user", () => {
      const state = reducer(initialState, setUser(mockUser));
      expect(state.user).toEqual(mockUser);
    });
  });

  describe("doneBootstrapping", () => {
    it("clears the bootstrapping flag", () => {
      const state = reducer({ ...initialState, isBootstrapping: true }, doneBootstrapping());
      expect(state.isBootstrapping).toBe(false);
    });
  });

  describe("logout", () => {
    it("clears all auth state", () => {
      const loggedIn = {
        user: mockUser,
        accessToken: "acc-token",
        refreshToken: "ref-token",
        isBootstrapping: false,
      };

      const state = reducer(loggedIn, logout());

      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isBootstrapping).toBe(false);
    });
  });
});
