import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Channel } from "@/types";

interface TypingEntry {
  userId: string;
  username: string;
}

interface UIState {
  selectedChannelId: string | null;
  selectedChannel: Channel | null;
  showMembersSidebar: boolean;
  showGamePanel: boolean;
  activeView: "chat" | "friends" | "games" | "invites";
  typingUsers: Record<string, TypingEntry[]>; // channelId → users currently typing
}

const initialState: UIState = {
  selectedChannelId: null,
  selectedChannel: null,
  showMembersSidebar: true,
  showGamePanel: false,
  activeView: "chat",
  typingUsers: {},
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    selectChannel(state, action: PayloadAction<Channel>) {
      state.selectedChannelId = action.payload.id;
      state.selectedChannel = action.payload as Channel;
      state.activeView = "chat";
    },
    clearChannel(state) {
      state.selectedChannelId = null;
      state.selectedChannel = null;
    },
    toggleMembersSidebar(state) {
      state.showMembersSidebar = !state.showMembersSidebar;
    },
    openGamePanel(state) {
      state.showGamePanel = true;
      state.showMembersSidebar = false;
    },
    closeGamePanel(state) {
      state.showGamePanel = false;
    },
    toggleGamePanel(state) {
      state.showGamePanel = !state.showGamePanel;
    },
    setActiveView(state, action: PayloadAction<"chat" | "friends" | "games" | "invites">) {
      state.activeView = action.payload;
    },
    setTyping(state, action: PayloadAction<{ channelId: string; userId: string; username: string }>) {
      const { channelId, userId, username } = action.payload;
      const existing = state.typingUsers[channelId] ?? [];
      state.typingUsers[channelId] = [...existing.filter((u) => u.userId !== userId), { userId, username }];
    },
    clearTyping(state, action: PayloadAction<{ channelId: string; userId: string }>) {
      const { channelId, userId } = action.payload;
      if (state.typingUsers[channelId]) {
        state.typingUsers[channelId] = state.typingUsers[channelId].filter((u) => u.userId !== userId);
      }
    },
  },
});

export const { selectChannel, clearChannel, toggleMembersSidebar, openGamePanel, closeGamePanel, toggleGamePanel, setActiveView, setTyping, clearTyping } = uiSlice.actions;
export default uiSlice.reducer;
