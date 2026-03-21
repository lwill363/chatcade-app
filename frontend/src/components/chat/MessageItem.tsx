import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Avatar } from "@/components/ui/Avatar";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import {
  useEditMessageMutation,
  useDeleteMessageMutation,
} from "@/features/messages/messagesApi";
import { useGetActiveGameQuery, useJoinGameMutation, useForfeitGameMutation } from "@/features/games/gamesApi";
import { openGamePanel } from "@/features/ui/uiSlice";
import type { Message } from "@/types";

interface MessageItemProps {
  message: Message;
  isFirst: boolean;
  channelOwnerId?: string;
}

export function MessageItem({ message, isFirst, channelOwnerId }: MessageItemProps) {
  const currentUser = useAppSelector((s) => s.auth.user);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarBelow, setToolbarBelow] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (bubbleRef.current) {
      const { top } = bubbleRef.current.getBoundingClientRect();
      setToolbarBelow(top < 100);
    }
    setShowToolbar(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setShowToolbar(false), 200);
  }, []);

  const [editMessage, { isLoading: isEditLoading }] = useEditMessageMutation();
  const [deleteMessage, { isLoading: isDeleteLoading }] = useDeleteMessageMutation();

  const authorName = message.author?.username ?? "Deleted User";
  const isOwnMessage = !!message.author && currentUser?.id === message.author.id;
  const isSpaceOwner = currentUser?.id === channelOwnerId;
  const isDeleted = !!message.deletedAt;
  const canDelete = !isDeleted && (isOwnMessage || isSpaceOwner);
  const canEdit = !isDeleted && isOwnMessage;

  useEffect(() => {
    if (isEditing) {
      editRef.current?.focus();
      editRef.current?.setSelectionRange(
        editRef.current.value.length,
        editRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      return;
    }
    await editMessage({ messageId: message.id, channelId: message.channelId, content: trimmed });
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleEdit(); }
    if (e.key === "Escape") { e.preventDefault(); setEditContent(message.content); setIsEditing(false); }
  };

  const handleDelete = () => {
    if (!confirm("Delete this message?")) return;
    void deleteMessage({ messageId: message.id, channelId: message.channelId });
  };

  const timeStr = format(new Date(message.createdAt), "h:mm a");

  if (message.type === "SYSTEM") {
    const eventText =
      message.content === "joined" ? "joined the room" :
      message.content === "left" ? "left the room" :
      "was removed from the room";
    return (
      <div className="flex items-center justify-center px-4 py-1.5">
        <span className="text-xs text-dim">
          <span className="font-semibold text-muted">{authorName}</span> {eventText}
        </span>
      </div>
    );
  }

  if (message.type === "GAME_RESULT") {
    return (
      <div className="flex items-center justify-center px-4 py-1.5">
        <span className="text-xs text-dim">{message.content}</span>
      </div>
    );
  }

  if (message.type === "GAME_INVITE") {
    return <GameInviteMessage message={message} currentUserId={currentUser?.id} />;
  }

  return (
    <div className={`flex items-end gap-2 px-4 py-0.5 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
      <div className="w-8 shrink-0">
        {!isOwnMessage && isFirst ? (
          <Avatar username={authorName} size="sm" />
        ) : !isOwnMessage ? (
          <div className="w-8" />
        ) : null}
      </div>

      <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? "items-end" : "items-start"}`}>
        {isFirst && !isOwnMessage && (
          <span className="text-[11px] font-extrabold text-muted mb-1 ml-1">{authorName}</span>
        )}

        <div
          ref={bubbleRef}
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Toolbar */}
          {(canEdit || canDelete) && !isEditing && showToolbar && (
            <div
              className={`absolute ${toolbarBelow ? "top-full mt-1" : "bottom-full mb-1"} ${isOwnMessage ? "right-0" : "left-0"} flex items-center gap-1 bg-surface border border-white/10 rounded-lg shadow-lg px-1 py-0.5 z-10`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {canEdit && (
                <button onClick={() => setIsEditing(true)} className="p-1.5 text-muted hover:text-foreground rounded hover:bg-white/10 cursor-pointer" title="Edit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
              )}
              {canDelete && (
                <button onClick={handleDelete} disabled={isDeleteLoading} className="p-1.5 text-muted hover:text-red-400 rounded hover:bg-white/10 cursor-pointer disabled:opacity-50" title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {message.deletedAt ? (
            <div className={`px-3.5 pt-2 pb-1.5 text-sm leading-relaxed ${
              isOwnMessage
                ? "bg-primary/30 rounded-2xl rounded-br-sm"
                : "bg-surface/50 border border-white/5 rounded-2xl rounded-bl-sm"
            }`}>
              <span className="italic text-dim">This message was deleted</span>
              <div className={`text-[10px] mt-0.5 text-right ${isOwnMessage ? "text-white/40" : "text-dim"}`}>
                {timeStr}
              </div>
            </div>
          ) : isEditing ? (
            <div className="w-64">
              <textarea
                ref={editRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                disabled={isEditLoading}
                rows={1}
                className="w-full bg-raised border border-white/10 text-foreground text-sm rounded-xl px-3 py-2 resize-none outline-none focus:border-primary/50"
              />
              <p className="text-xs text-dim mt-1">
                escape to <button onClick={() => { setEditContent(message.content); setIsEditing(false); }} className="text-primary hover:underline cursor-pointer">cancel</button>
                {" "}· enter to <button onClick={() => void handleEdit()} className="text-primary hover:underline cursor-pointer">save</button>
              </p>
            </div>
          ) : (
            <div className={`px-3.5 pt-2 pb-1.5 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap ${
              isOwnMessage
                ? "bg-primary text-white rounded-2xl rounded-br-sm shadow-lg"
                : "bg-surface border border-white/10 text-foreground rounded-2xl rounded-bl-sm"
            }`}>
              <div>{message.content}</div>
              <div className={`text-[10px] mt-0.5 text-right ${isOwnMessage ? "text-white/60" : "text-dim"}`}>
                {timeStr}{message.editedAt && " · edited"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Game invite card ──────────────────────────────────────────────────────────

const GAME_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="8" y1="2" x2="8" y2="22" />
    <line x1="16" y1="2" x2="16" y2="22" />
    <line x1="2" y1="8" x2="22" y2="8" />
    <line x1="2" y1="16" x2="22" y2="16" />
  </svg>
);

function GameInviteMessage({ message, currentUserId }: { message: Message; currentUserId?: string }) {
  const dispatch = useAppDispatch();
  const [joinGame, { isLoading: isJoining }] = useJoinGameMutation();
  const [forfeitGame, { isLoading: isCancelling }] = useForfeitGameMutation();
  const { data: activeGame, isLoading: isGameLoading } = useGetActiveGameQuery(
    { channelId: message.channelId }
  );
  const metadata = message.metadata;

  const authorName = message.author?.username ?? "Deleted User";
  const isAuthor = !!message.author && currentUserId === message.author.id;
  const timeStr = format(new Date(message.createdAt), "h:mm a");

  const isThisGame = activeGame?.id === metadata?.gameId;
  const isWaiting = isThisGame && activeGame?.status === "WAITING";
  const isActive = isThisGame && activeGame?.status === "ACTIVE";
  // isFinished: game was actually played and has a result to show (both players present)
  // isOver: game is done regardless of whether we have result data
  const isFinished = isThisGame && activeGame?.status === "FINISHED" && activeGame.players.length >= 2;
  const isOver = (!isGameLoading && !isThisGame) || (isThisGame && activeGame?.status === "FINISHED");

  // Auto-open the game panel for the author when an opponent joins
  useEffect(() => {
    if (isActive && isAuthor) {
      dispatch(openGamePanel());
    }
  }, [isActive, isAuthor, dispatch]);

  if (!metadata) return null;

  const handleJoin = async () => {
    dispatch(openGamePanel());
    try {
      await joinGame({ gameId: metadata.gameId, channelId: message.channelId }).unwrap();
    } catch {
      // Panel will show current state
    }
  };

  return (
    <div className="px-4 py-2">
      <div className={`mx-auto bg-surface border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3 max-w-xs transition-opacity ${isOver ? "opacity-40" : ""}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isOver ? "bg-white/5 text-dim" : "bg-primary/10 border border-primary/20 text-primary"}`}>
          {GAME_ICON}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted leading-snug">
            <span className="font-semibold text-foreground">
              {isAuthor ? "You" : authorName}
            </span>
            {isOver
              ? <> played <span className="font-semibold text-foreground">{metadata.gameName}</span></>
              : <> want{isAuthor ? "" : "s"} to play <span className="font-semibold text-foreground">{metadata.gameName}</span></>
            }
          </p>
          <p className="text-[10px] text-dim mt-0.5">{timeStr}</p>
        </div>
        {isFinished ? (
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-xs font-semibold text-foreground">
              {activeGame!.winner ? `${activeGame!.winner.username} won` : "Draw"}
            </span>
            <button
              onClick={() => dispatch(openGamePanel())}
              className="text-[10px] text-primary hover:text-primary/80 cursor-pointer"
            >
              View result
            </button>
          </div>
        ) : isOver ? (
          <span className="text-[10px] text-dim shrink-0">Ended</span>
        ) : isWaiting && isAuthor ? (
          <button
            onClick={() => void forfeitGame({ gameId: metadata.gameId, channelId: message.channelId })}
            disabled={isCancelling}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-dim font-semibold cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
          >
            {isCancelling ? "..." : "Cancel"}
          </button>
        ) : isWaiting ? (
          <button
            onClick={() => void handleJoin()}
            disabled={isJoining}
            className="px-3 py-1.5 text-xs rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
          >
            {isJoining ? "..." : "Join"}
          </button>
        ) : isActive ? (
          <button
            onClick={() => dispatch(openGamePanel())}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-foreground font-semibold cursor-pointer shrink-0 transition-colors"
          >
            Open
          </button>
        ) : null}
      </div>
    </div>
  );
}
