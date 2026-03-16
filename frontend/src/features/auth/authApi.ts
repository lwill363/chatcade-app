import { api } from "@/services/api";
import type { User, LoginResponse, RefreshResponse } from "@/types";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<
      User,
      { email: string; password: string; username: string }
    >({
      query: (body) => ({ url: "/api/auth/register", method: "POST", body }),
    }),

    login: builder.mutation<
      LoginResponse,
      { email: string; password: string }
    >({
      query: (body) => ({ url: "/api/auth/login", method: "POST", body }),
    }),

    refresh: builder.mutation<RefreshResponse, { refreshToken: string }>({
      query: (body) => ({ url: "/api/auth/refresh", method: "POST", body }),
    }),

    logout: builder.mutation<void, { refreshToken: string }>({
      query: (body) => ({ url: "/api/auth/logout", method: "POST", body }),
      invalidatesTags: ["User", "Message", "Member", "Channel"],
    }),

    getAuthMe: builder.query<User, void>({
      query: () => "/api/auth/me",
      providesTags: [{ type: "User", id: "ME" }],
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetAuthMeQuery,
} = authApi;
