import { api } from "@/services/api";
import type { Game } from "@/types";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export const gamesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── Active channel games (all channels the user is in) ────────────────────
    getActiveChannelGames: builder.query<Game[], void>({
      query: () => "/api/games/channel",
      providesTags: [{ type: "Game" as const, id: "ACTIVE_LIST" }],
    }),

    // ── Solo game ─────────────────────────────────────────────────────────────
    getActiveSoloGame: builder.query<Game | null, void>({
      query: () => "/api/games/solo",
      providesTags: [{ type: "Game" as const, id: "solo" }],
    }),

    createSoloGame: builder.mutation<Game, { difficulty: Difficulty }>({
      query: (body) => ({ url: "/api/games/solo", method: "POST", body }),
      // Immediately write the created game into the solo-game cache so the
      // board is enabled the instant the playing screen first renders.
      // invalidatesTags triggers a background refetch as a consistency backstop.
      invalidatesTags: [{ type: "Game", id: "solo" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data: createdGame } = await queryFulfilled;
          dispatch(
            gamesApi.util.updateQueryData("getActiveSoloGame", undefined, () => createdGame)
          );
        } catch {
          // creation failed — leave cache as-is
        }
      },
    }),

    // ── Channel game ──────────────────────────────────────────────────────────
    getActiveGame: builder.query<Game | null, { channelId: string }>({
      query: ({ channelId }) => `/api/games/channel/${channelId}`,
      providesTags: (_result, _error, { channelId }) => [
        { type: "Game" as const, id: `channel-${channelId}` },
      ],
    }),

    createGame: builder.mutation<Game, { channelId: string; vsBot: boolean; difficulty?: Difficulty }>({
      query: ({ channelId, vsBot, difficulty = "HARD" }) => ({
        url: `/api/games/channel/${channelId}`,
        method: "POST",
        body: { vsBot, difficulty },
      }),
      invalidatesTags: (_result, _error, { channelId }) => [
        { type: "Game", id: `channel-${channelId}` },
      ],
    }),

    // ── Shared actions ────────────────────────────────────────────────────────
    joinGame: builder.mutation<Game, { gameId: string; channelId: string }>({
      query: ({ gameId }) => ({ url: `/api/games/${gameId}/join`, method: "POST" }),
      invalidatesTags: (_result, _error, { channelId }) => [
        { type: "Game", id: `channel-${channelId}` },
      ],
    }),

    makeMove: builder.mutation<Game, { gameId: string; move: Record<string, unknown>; channelId?: string }>({
      query: ({ gameId, move }) => ({
        url: `/api/games/${gameId}/move`,
        method: "POST",
        body: { move },
      }),
      invalidatesTags: (_result, _error, { channelId }) =>
        channelId
          ? [{ type: "Game", id: `channel-${channelId}` }]
          : [{ type: "Game", id: "solo" }],
      // For solo games, immediately apply the bot's response to the cache so
      // the board re-enables for the next turn without waiting for a refetch.
      async onQueryStarted({ channelId }, { dispatch, queryFulfilled }) {
        if (channelId) return;
        try {
          const { data: updatedGame } = await queryFulfilled;
          dispatch(
            gamesApi.util.updateQueryData("getActiveSoloGame", undefined, () => updatedGame)
          );
        } catch {
          // error will be visible via isMoveError in the UI
        }
      },
    }),

    forfeitGame: builder.mutation<Game, { gameId: string; channelId?: string }>({
      query: ({ gameId }) => ({ url: `/api/games/${gameId}/forfeit`, method: "POST" }),
      invalidatesTags: (_result, _error, { channelId }) =>
        channelId
          ? [{ type: "Game", id: `channel-${channelId}` }]
          : [{ type: "Game", id: "solo" }],
    }),
  }),
});

export const {
  useGetActiveChannelGamesQuery,
  useGetActiveSoloGameQuery,
  useCreateSoloGameMutation,
  useGetActiveGameQuery,
  useCreateGameMutation,
  useJoinGameMutation,
  useMakeMoveMutation,
  useForfeitGameMutation,
} = gamesApi;
