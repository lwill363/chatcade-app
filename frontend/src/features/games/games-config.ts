import type { Difficulty } from "@/features/games/gamesApi";

export const DIFFICULTY_META: Record<Difficulty, { label: string; description: string; badge: string }> = {
  EASY:   { label: "Easy",   description: "Bot plays randomly — you can definitely win!", badge: "bg-green-500/15 text-green-400" },
  MEDIUM: { label: "Medium", description: "Bot plays optimally about half the time.",       badge: "bg-yellow-500/15 text-yellow-400" },
  HARD:   { label: "Hard",   description: "Perfect play — best you can do is a draw.",      badge: "bg-red-500/15 text-red-400" },
};
