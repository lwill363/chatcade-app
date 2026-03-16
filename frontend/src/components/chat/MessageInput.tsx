import { useRef, useState, type KeyboardEvent, type FormEvent } from "react";
import { useSendMessageMutation } from "@/features/messages/messagesApi";
import { useCreateGameMutation, useGetActiveGameQuery } from "@/features/games/gamesApi";


interface SlashCommand {
  command: string;
  description: string;
  icon: React.ReactNode;
}

const TTT_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="8" y1="2" x2="8" y2="22" />
    <line x1="16" y1="2" x2="16" y2="22" />
    <line x1="2" y1="8" x2="22" y2="8" />
    <line x1="2" y1="16" x2="22" y2="16" />
  </svg>
);

const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/tictactoe", description: "Challenge someone to Tic-Tac-Toe", icon: TTT_ICON },
];

interface MessageInputProps {
  channelId: string;
  placeholder: string;
}

export function MessageInput({ channelId, placeholder }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [sendMessage, { isLoading }] = useSendMessageMutation();
  const [createGame, { isLoading: isCreatingGame }] = useCreateGameMutation();
  const { data: activeGame } = useGetActiveGameQuery({ channelId });

  const filteredCommands = slashQuery !== null
    ? SLASH_COMMANDS.filter((c) => c.command.slice(1).startsWith(slashQuery))
    : [];

  const clearInput = () => {
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    setSlashQuery(null);
  };

  const executeCommand = async (command: string) => {
    clearInput();
    if (command === "/tictactoe") {
      if (activeGame) {
        setGameError("A game is already in progress. Finish or cancel it first.");
        setTimeout(() => setGameError(null), 4000);
        return;
      }
      try {
        await createGame({ channelId, vsBot: false }).unwrap();
      } catch {
        setGameError("Failed to start game. Try again.");
        setTimeout(() => setGameError(null), 4000);
      }
    }
  };

  const submit = async () => {
    const content = textareaRef.current?.value.trim();
    if (!content || isLoading) return;

    // Intercept slash commands
    if (content.startsWith("/")) {
      const match = SLASH_COMMANDS.find((c) => c.command === content.split(" ")[0]);
      if (match) { void executeCommand(match.command); return; }
    }

    textareaRef.current!.value = "";
    textareaRef.current!.style.height = "auto";
    setSlashQuery(null);

    try {
      await sendMessage({ channelId, content }).unwrap();
    } catch {
      if (textareaRef.current) textareaRef.current.value = content;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && slashQuery !== null) {
      e.preventDefault();
      setSlashQuery(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (slashQuery !== null && filteredCommands.length > 0) {
        void executeCommand(filteredCommands[0].command);
        return;
      }
      void submit();
    }
  };

  const handleInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;

    const val = target.value;
    if (val.startsWith("/") && !val.includes(" ") && !val.includes("\n")) {
      setSlashQuery(val.slice(1).toLowerCase());
    } else {
      setSlashQuery(null);
    }
  };

  const isBusy = isLoading || isCreatingGame;

  return (
    <div className="px-4 pb-6 pt-2 shrink-0 relative">
      {/* Game error toast */}
      {gameError && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg">
          {gameError}
        </div>
      )}
      {/* Slash command dropdown */}
      {slashQuery !== null && filteredCommands.length > 0 && (
        <div className="absolute bottom-full left-4 right-16 mb-2 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-dim px-3 pt-2.5 pb-1">Commands</p>
          {filteredCommands.map((cmd) => (
            <button
              key={cmd.command}
              onMouseDown={(e) => { e.preventDefault(); void executeCommand(cmd.command); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left cursor-pointer transition-colors"
            >
              <span className="text-primary shrink-0">{cmd.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{cmd.command}</p>
                <p className="text-xs text-muted">{cmd.description}</p>
              </div>
            </button>
          ))}
          <p className="text-[10px] text-dim px-3 pb-2 pt-1">Tab or Enter to select · Esc to dismiss</p>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1 flex items-end bg-raised border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            className="flex-1 bg-transparent text-foreground placeholder:text-dim text-sm resize-none outline-none max-h-30 leading-5 font-[Nunito]"
            style={{ height: "20px" }}
            disabled={isBusy}
          />
        </div>
        <button
          onClick={() => void submit()}
          disabled={isBusy}
          className="w-10 h-10 bg-primary hover:bg-primary-dark rounded-xl flex items-center justify-center shrink-0 transition-all shadow-lg disabled:opacity-50 cursor-pointer hover:scale-105 active:scale-95"
          title="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
