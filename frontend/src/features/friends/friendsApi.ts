import { api } from "@/services/api";
import type { FriendDto, FriendRequestDto } from "@/types";

export const friendsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listFriends: builder.query<FriendDto[], void>({
      query: () => "/api/friends",
      providesTags: [{ type: "Friend", id: "LIST" }],
    }),

    listIncomingRequests: builder.query<FriendRequestDto[], void>({
      query: () => "/api/friends/requests/incoming",
      providesTags: [{ type: "FriendRequest", id: "INCOMING" }],
    }),

    listOutgoingRequests: builder.query<FriendRequestDto[], void>({
      query: () => "/api/friends/requests/outgoing",
      providesTags: [{ type: "FriendRequest", id: "OUTGOING" }],
    }),

    sendFriendRequest: builder.mutation<void, { addresseeId: string }>({
      query: (body) => ({ url: "/api/friends/requests", method: "POST", body }),
      invalidatesTags: [
        { type: "FriendRequest", id: "OUTGOING" },
      ],
    }),

    respondToRequest: builder.mutation<void, { requesterId: string; action: "accept" | "decline" }>({
      query: ({ requesterId, action }) => ({
        url: `/api/friends/requests/${requesterId}`,
        method: "PATCH",
        body: { action },
      }),
      invalidatesTags: [
        { type: "Friend", id: "LIST" },
        { type: "FriendRequest", id: "INCOMING" },
      ],
    }),

    removeFriend: builder.mutation<void, string>({
      query: (friendId) => ({ url: `/api/friends/${friendId}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Friend", id: "LIST" },
        { type: "FriendRequest", id: "OUTGOING" },
      ],
    }),
  }),
});

export const {
  useListFriendsQuery,
  useListIncomingRequestsQuery,
  useListOutgoingRequestsQuery,
  useSendFriendRequestMutation,
  useRespondToRequestMutation,
  useRemoveFriendMutation,
} = friendsApi;
