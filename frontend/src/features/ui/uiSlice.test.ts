import { describe, it, expect } from "vitest";
import reducer, {
  selectChannel,
  clearChannel,
  toggleMembersSidebar,
  openGamePanel,
  closeGamePanel,
  toggleGamePanel,
  setActiveView,
  setTyping,
  clearTyping,
} from "./uiSlice";
import { makeChannel } from "@/test/factories";

const initialState = {
  selectedChannelId: null,
  selectedChannel: null,
  showMembersSidebar: true,
  showGamePanel: false,
  activeView: "chat" as const,
  typingUsers: {},
};

const mockRoom = makeChannel();

describe("uiSlice", () => {
  describe("selectChannel", () => {
    it("sets the selected channel and switches to chat view", () => {
      const state = reducer({ ...initialState, activeView: "friends" }, selectChannel(mockRoom));

      expect(state.selectedChannelId).toBe("channel-1");
      expect(state.selectedChannel).toEqual(mockRoom);
      expect(state.activeView).toBe("chat");
    });
  });

  describe("clearChannel", () => {
    it("clears the selected channel", () => {
      const populated = { ...initialState, selectedChannelId: "channel-1", selectedChannel: mockRoom };
      const state = reducer(populated, clearChannel());

      expect(state.selectedChannelId).toBeNull();
      expect(state.selectedChannel).toBeNull();
    });
  });

  describe("toggleMembersSidebar", () => {
    it("toggles from true to false", () => {
      const state = reducer({ ...initialState, showMembersSidebar: true }, toggleMembersSidebar());
      expect(state.showMembersSidebar).toBe(false);
    });

    it("toggles from false to true", () => {
      const state = reducer({ ...initialState, showMembersSidebar: false }, toggleMembersSidebar());
      expect(state.showMembersSidebar).toBe(true);
    });
  });

  describe("openGamePanel", () => {
    it("opens the game panel and hides the members sidebar", () => {
      const state = reducer({ ...initialState, showMembersSidebar: true }, openGamePanel());

      expect(state.showGamePanel).toBe(true);
      expect(state.showMembersSidebar).toBe(false);
    });
  });

  describe("closeGamePanel", () => {
    it("closes the game panel", () => {
      const state = reducer({ ...initialState, showGamePanel: true }, closeGamePanel());
      expect(state.showGamePanel).toBe(false);
    });
  });

  describe("toggleGamePanel", () => {
    it("toggles from false to true", () => {
      const state = reducer({ ...initialState, showGamePanel: false }, toggleGamePanel());
      expect(state.showGamePanel).toBe(true);
    });

    it("toggles from true to false", () => {
      const state = reducer({ ...initialState, showGamePanel: true }, toggleGamePanel());
      expect(state.showGamePanel).toBe(false);
    });
  });

  describe("setActiveView", () => {
    it("updates the active view", () => {
      const state = reducer(initialState, setActiveView("friends"));
      expect(state.activeView).toBe("friends");
    });
  });

  describe("setTyping", () => {
    it("adds a new typing user", () => {
      const state = reducer(
        initialState,
        setTyping({ channelId: "channel-1", userId: "user-1", username: "alice" })
      );

      expect(state.typingUsers["channel-1"]).toEqual([{ userId: "user-1", username: "alice" }]);
    });

    it("replaces the existing entry for the same user", () => {
      const existing = {
        ...initialState,
        typingUsers: { "channel-1": [{ userId: "user-1", username: "alice" }] },
      };

      const state = reducer(
        existing,
        setTyping({ channelId: "channel-1", userId: "user-1", username: "alice_updated" })
      );

      expect(state.typingUsers["channel-1"]).toHaveLength(1);
      expect(state.typingUsers["channel-1"][0].username).toBe("alice_updated");
    });

    it("accumulates multiple typing users in the same channel", () => {
      const existing = {
        ...initialState,
        typingUsers: { "channel-1": [{ userId: "user-1", username: "alice" }] },
      };

      const state = reducer(
        existing,
        setTyping({ channelId: "channel-1", userId: "user-2", username: "bob" })
      );

      expect(state.typingUsers["channel-1"]).toHaveLength(2);
    });
  });

  describe("clearTyping", () => {
    it("removes the typing user from the channel", () => {
      const existing = {
        ...initialState,
        typingUsers: {
          "channel-1": [
            { userId: "user-1", username: "alice" },
            { userId: "user-2", username: "bob" },
          ],
        },
      };

      const state = reducer(existing, clearTyping({ channelId: "channel-1", userId: "user-1" }));

      expect(state.typingUsers["channel-1"]).toEqual([{ userId: "user-2", username: "bob" }]);
    });

    it("is a no-op for a channel with no typing users", () => {
      const state = reducer(initialState, clearTyping({ channelId: "channel-1", userId: "user-1" }));
      expect(state.typingUsers["channel-1"]).toBeUndefined();
    });
  });
});
