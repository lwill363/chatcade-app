import { cn } from "@/lib/utils";

interface AvatarProps {
  username: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

// Warm, deterministic palette
const COLORS = [
  { bg: "bg-[#9b3a5a]", hex: "#9b3a5a" },
  { bg: "bg-[#7a3510]", hex: "#7a3510" },
  { bg: "bg-[#2a7a76]", hex: "#2a7a76" },
  { bg: "bg-[#7a5a10]", hex: "#7a5a10" },
  { bg: "bg-[#5a3a8a]", hex: "#5a3a8a" },
  { bg: "bg-[#8a3a3a]", hex: "#8a3a3a" },
  { bg: "bg-[#3a6a3a]", hex: "#3a6a3a" },
  { bg: "bg-[#8a5a20]", hex: "#8a5a20" },
];

function colorIndex(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLORS.length;
}

export function avatarHexColor(username: string): string {
  return COLORS[colorIndex(username)].hex;
}

const sizes = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-2xl",
};

export function Avatar({ username, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-foreground font-bold select-none shrink-0",
        COLORS[colorIndex(username)].bg,
        sizes[size],
        className
      )}
      title={username}
    >
      {username[0]?.toUpperCase()}
    </div>
  );
}
