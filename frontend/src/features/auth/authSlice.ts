import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  // True while we're attempting to restore a session from a stored refresh
  // token on page load. ProtectedRoute waits for this to finish before
  // deciding whether to redirect to /login.
  isBootstrapping: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isBootstrapping: !!localStorage.getItem("chatcade_refresh_token"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    doneBootstrapping(state) {
      state.isBootstrapping = false;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isBootstrapping = false;
    },
  },
});

export const { setCredentials, setUser, doneBootstrapping, logout } =
  authSlice.actions;
export default authSlice.reducer;
