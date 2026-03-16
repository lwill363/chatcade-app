import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Channel } from "@/types";

interface UIState {
  selectedChannelId: string | null;
  selectedChannel: Channel | null;
  showMembersSidebar: boolean;
  showGamePanel: boolean;
  activeView: "chat" | "friends" | "games" | "invites";
}

const initialState: UIState = {
  selectedChannelId: null,
  selectedChannel: null,
  showMembersSidebar: true,
  showGamePanel: false,
  activeView: "chat",
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
  },
});

export const { selectChannel, clearChannel, toggleMembersSidebar, openGamePanel, closeGamePanel, toggleGamePanel, setActiveView } = uiSlice.actions;
export default uiSlice.reducer;
