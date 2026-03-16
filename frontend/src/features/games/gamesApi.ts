import { api } from "@/services/api";
import type { Game } from "@/types";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export const gamesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── Solo game ─────────────────────────────────────────────────────────────
    getActiveSoloGame: builder.query<Game | null, void>({
      query: () => "/api/games/solo",
      providesTags: [{ type: "Game" as const, id: "solo" }],
    }),

    createSoloGame: builder.mutation<Game, { difficulty: Difficulty }>({
      query: (body) => ({ url: "/api/games/solo", method: "POST", body }),
      invalidatesTags: [{ type: "Game", id: "solo" }],
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
  useGetActiveSoloGameQuery,
  useCreateSoloGameMutation,
  useGetActiveGameQuery,
  useCreateGameMutation,
  useJoinGameMutation,
  useMakeMoveMutation,
  useForfeitGameMutation,
} = gamesApi;
