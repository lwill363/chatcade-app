import { api } from "@/services/api";
import type { User, PublicUser, PresenceDto } from "@/types";

export const usersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<User, void>({
      query: () => "/api/users/me",
      providesTags: [{ type: "User", id: "ME" }],
    }),

    updateMyProfile: builder.mutation<User, { username?: string; displayName?: string | null; bio?: string | null }>({
      query: (body) => ({ url: "/api/users/me", method: "PATCH", body }),
      invalidatesTags: [{ type: "User", id: "ME" }],
    }),

    getUserById: builder.query<PublicUser, string>({
      query: (userId) => `/api/users/${userId}`,
      providesTags: (_result, _error, userId) => [
        { type: "User", id: userId },
      ],
    }),

    searchUsers: builder.query<{ id: string; username: string }[], string>({
      query: (q) => ({ url: "/api/users/search", params: { q } }),
    }),

    getPresence: builder.query<PresenceDto[], string[]>({
      query: (userIds) => `/api/users/presence?userIds=${userIds.join(",")}`,
      providesTags: [{ type: "Presence", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useGetUserByIdQuery,
  useSearchUsersQuery,
  useGetPresenceQuery,
} = usersApi;
