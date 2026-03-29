import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MessageItem } from "./MessageItem";
import { makeStore, makeMessage } from "@/test/factories";
import type { Message } from "@/types";

// RTK Query hooks used inside MessageItem / GameInviteMessage
vi.mock("@/features/messages/messagesApi", () => ({
  useEditMessageMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteMessageMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/features/games/gamesApi", () => ({
  useGetActiveGameQuery: () => ({ data: null, isLoading: false }),
  useJoinGameMutation: () => [vi.fn(), { isLoading: false }],
  useForfeitGameMutation: () => [vi.fn(), { isLoading: false }],
}));

function renderMessage(message: Message, authUser?: { id: string; username: string }) {
  const store = makeStore(authUser);
  return render(
    <Provider store={store}>
      <MessageItem message={message} isFirst={true} />
    </Provider>
  );
}

const baseMessage = makeMessage();

describe("MessageItem", () => {
  describe("SYSTEM message", () => {
    it("renders 'joined the room' for join event", () => {
      renderMessage({ ...baseMessage, type: "SYSTEM", content: "joined" });
      expect(screen.getByText(/joined the room/)).toBeInTheDocument();
    });

    it("renders 'left the room' for leave event", () => {
      renderMessage({ ...baseMessage, type: "SYSTEM", content: "left" });
      expect(screen.getByText(/left the room/)).toBeInTheDocument();
    });

    it("renders 'was removed from the room' for kick event", () => {
      renderMessage({ ...baseMessage, type: "SYSTEM", content: "removed" });
      expect(screen.getByText(/was removed from the room/)).toBeInTheDocument();
    });

    it("shows the author's name in system messages", () => {
      renderMessage({ ...baseMessage, type: "SYSTEM", content: "joined" });
      expect(screen.getByText("bob")).toBeInTheDocument();
    });

    it("shows 'Deleted User' when author is null", () => {
      renderMessage({ ...baseMessage, type: "SYSTEM", content: "joined", author: null });
      expect(screen.getByText("Deleted User")).toBeInTheDocument();
    });
  });

  describe("GAME_RESULT message", () => {
    it("renders the result content", () => {
      renderMessage({ ...baseMessage, type: "GAME_RESULT", content: "alice wins!" });
      expect(screen.getByText("alice wins!")).toBeInTheDocument();
    });
  });

  describe("USER message", () => {
    it("renders the message content", () => {
      renderMessage(baseMessage);
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("renders the author username when isFirst", () => {
      renderMessage(baseMessage, { id: "user-1", username: "alice" });
      expect(screen.getByText("bob")).toBeInTheDocument();
    });

    it("shows 'This message was deleted' for soft-deleted messages", () => {
      renderMessage({ ...baseMessage, deletedAt: new Date().toISOString() });
      expect(screen.getByText("This message was deleted")).toBeInTheDocument();
    });

    it("shows '· edited' indicator for edited messages", () => {
      renderMessage({ ...baseMessage, editedAt: new Date().toISOString() });
      expect(screen.getByText(/edited/)).toBeInTheDocument();
    });
  });
});
