import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/app/store";
import { logout, setCredentials } from "@/features/auth/authSlice";
import type { RefreshResponse } from "@/types";

const REFRESH_TOKEN_KEY = "chatcade_refresh_token";

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearStoredRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshToken =
      (api.getState() as RootState).auth.refreshToken ??
      getStoredRefreshToken();

    if (refreshToken) {
      const refreshResult = await rawBaseQuery(
        { url: "/api/auth/refresh", method: "POST", body: { refreshToken } },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const { accessToken, refreshToken: newRefreshToken } =
          refreshResult.data as RefreshResponse;
        api.dispatch(setCredentials({ accessToken, refreshToken: newRefreshToken }));
        setStoredRefreshToken(newRefreshToken);
        // Retry the original request with the new token
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
        clearStoredRefreshToken();
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["User", "Space", "Message", "Member", "Friend", "FriendRequest", "Channel", "Presence", "Invite", "Game"],
  keepUnusedDataFor: 300,
  endpoints: () => ({}),
});
