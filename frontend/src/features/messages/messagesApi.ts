import { api } from "@/services/api";
import type { Message } from "@/types";

export const messagesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listMessages: builder.query<
      Message[],
      { channelId: string; limit?: number; before?: string }
    >({
      query: ({ channelId, limit = 50, before }) => ({
        url: `/api/channels/${channelId}/messages`,
        params: { limit, ...(before ? { before } : {}) },
      }),
      providesTags: (_result, _error, { channelId }) => [
        { type: "Message" as const, id: `channel-${channelId}` },
      ],
    }),

    sendMessage: builder.mutation<Message, { channelId: string; content: string }>({
      query: ({ channelId, content }) => ({
        url: `/api/channels/${channelId}/messages`,
        method: "POST",
        body: { content },
      }),
      invalidatesTags: (_result, _error, { channelId }) => [
        { type: "Message", id: `channel-${channelId}` },
        { type: "Channel", id: "LIST" },
      ],
    }),

    editMessage: builder.mutation<
      Message,
      { messageId: string; channelId: string; content: string }
    >({
      query: ({ channelId, messageId, content }) => ({
        url: `/api/channels/${channelId}/messages/${messageId}`,
        method: "PATCH",
        body: { content },
      }),
      invalidatesTags: (_result, _error, { channelId }) => [
        { type: "Message", id: `channel-${channelId}` },
      ],
    }),

    deleteMessage: builder.mutation<void, { messageId: string; channelId: string }>({
      query: ({ channelId, messageId }) => ({
        url: `/api/channels/${channelId}/messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { channelId }) => [
        { type: "Message", id: `channel-${channelId}` },
      ],
    }),
  }),
});

export const {
  useListMessagesQuery,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
} = messagesApi;
