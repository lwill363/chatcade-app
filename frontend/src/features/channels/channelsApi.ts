import { api } from "@/services/api";
import type { Channel, RoomDetail, Member, ChannelInvite } from "@/types";

export const channelsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listChannels: builder.query<Channel[], void>({
      query: () => "/api/channels",
      providesTags: [{ type: "Channel", id: "LIST" }],
    }),

    createRoom: builder.mutation<RoomDetail, { name: string; description?: string; inviteeIds?: string[] }>({
      query: (body) => ({ url: "/api/channels/rooms", method: "POST", body }),
      invalidatesTags: [{ type: "Channel", id: "LIST" }],
    }),

    updateRoom: builder.mutation<RoomDetail, { channelId: string; name?: string; description?: string }>({
      query: ({ channelId, ...body }) => ({ url: `/api/channels/${channelId}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { channelId }) => [
        { type: "Channel", id: channelId },
        { type: "Channel", id: "LIST" },
      ],
    }),

    deleteRoom: builder.mutation<void, string>({
      query: (channelId) => ({ url: `/api/channels/${channelId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Channel", id: "LIST" }],
    }),

    joinRoom: builder.mutation<RoomDetail, string>({
      query: (channelId) => ({ url: `/api/channels/${channelId}/join`, method: "POST" }),
      invalidatesTags: [{ type: "Channel", id: "LIST" }],
    }),

    leaveRoom: builder.mutation<void, string>({
      query: (channelId) => ({ url: `/api/channels/${channelId}/leave`, method: "DELETE" }),
      invalidatesTags: [{ type: "Channel", id: "LIST" }],
    }),

    listChannelMembers: builder.query<Member[], string>({
      query: (channelId) => `/api/channels/${channelId}/members`,
      providesTags: (_result, _error, channelId) => [{ type: "Member", id: channelId }],
    }),

    kickChannelMember: builder.mutation<void, { channelId: string; userId: string }>({
      query: ({ channelId, userId }) => ({
        url: `/api/channels/${channelId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { channelId }) => [{ type: "Member", id: channelId }],
    }),

    getOrCreateDirectChannel: builder.mutation<{ id: string }, { userId: string }>({
      query: ({ userId }) => ({
        url: `/api/channels/dm/${userId}`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "Channel", id: "LIST" }],
    }),

    sendInvite: builder.mutation<void, { channelId: string; userId: string }>({
      query: ({ channelId, userId }) => ({
        url: `/api/channels/${channelId}/invites`,
        method: "POST",
        body: { userId },
      }),
    }),

    listMyInvites: builder.query<ChannelInvite[], void>({
      query: () => "/api/channels/invites",
      providesTags: [{ type: "Invite", id: "LIST" }],
    }),

    acceptInvite: builder.mutation<void, string>({
      query: (inviteId) => ({
        url: `/api/channels/invites/${inviteId}/accept`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "Invite", id: "LIST" }, { type: "Channel", id: "LIST" }],
    }),

    declineInvite: builder.mutation<void, string>({
      query: (inviteId) => ({
        url: `/api/channels/invites/${inviteId}/decline`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "Invite", id: "LIST" }],
    }),

    markChannelRead: builder.mutation<void, { channelId: string }>({
      query: ({ channelId }) => ({
        url: `/api/channels/${channelId}/read`,
        method: "PUT",
      }),
      invalidatesTags: [{ type: "Channel", id: "LIST" }],
    }),
  }),
});

export const {
  useListChannelsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useJoinRoomMutation,
  useLeaveRoomMutation,
  useListChannelMembersQuery,
  useKickChannelMemberMutation,
  useGetOrCreateDirectChannelMutation,
  useSendInviteMutation,
  useListMyInvitesQuery,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
  useMarkChannelReadMutation,
} = channelsApi;
