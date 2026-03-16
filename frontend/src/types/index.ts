export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PublicUser {
  id: string;
  username: string;
  role: string;
  displayName: string | null;
  bio: string | null;
  createdAt: string;
}

export interface RoomDetail {
  id: string;
  type: "ROOM";
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  _count: { members: number };
}

export interface Message {
  id: string;
  type: "USER" | "SYSTEM" | "GAME_INVITE" | "GAME_RESULT";
  content: string;
  metadata: { gameId: string; gameName: string; winnerLabel?: string | null; cancelled?: boolean } | null;
  channelId: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; username: string };
}

export interface Member {
  user: { id: string; username: string };
  joinedAt: string;
}

// A channel is either a room (group) or a direct message channel
export type Channel =
  | {
      id: string;
      type: "ROOM";
      name: string;
      description: string | null;
      ownerId: string;
      unreadCount: number;
      latestAt: string | null;
      latestMessage: { content: string; authorUsername: string } | null;
    }
  | {
      id: string;
      type: "DM";
      partnerId: string;
      partnerUsername: string;
      unreadCount: number;
      latestAt: string | null;
      latestMessage: { content: string; authorUsername: string } | null;
    };

export interface PresenceDto {
  userId: string;
  isOnline: boolean;
  isAway: boolean;
}

export interface ChannelInvite {
  id: string;
  channelId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  channel: { name: string };
  inviter: { id: string; username: string };
}

export interface FriendDto {
  friendshipId: string;
  userId: string;
  username: string;
  displayName: string | null;
}

export interface FriendRequestDto {
  friendshipId: string;
  userId: string;
  username: string;
  displayName: string | null;
  createdAt: string;
}

export interface ApiValidationDetail {
  field: string;
  message: string;
  keyword: string;
  params: unknown;
}

export interface ApiErrorData {
  error: string;
  code: number;
  message: string;
  details?: ApiValidationDetail[];
}

export function getApiErrorMessage(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data &&
    typeof (error.data as { message: unknown }).message === "string"
  ) {
    return (error.data as ApiErrorData).message;
  }
  return undefined;
}

export interface GamePlayer {
  position: number; // 1-based seat / turn order
  user: { id: string; username: string };
}

export interface Game {
  id: string;
  type: "TIC_TAC_TOE";
  channelId: string | null;
  status: "WAITING" | "ACTIVE" | "FINISHED";
  state: Record<string, unknown>; // game-type-specific (e.g. { board: [...] } for TicTacToe)
  currentTurn: string; // position as string: "1", "2", ...
  vsBot: boolean;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  winnerId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  players: GamePlayer[]; // sorted by position ascending
  winner: { id: string; username: string } | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; email: string; role: string };
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
