import { useEffect } from "react";
import { useHeartbeatMutation } from "@/features/users/usersApi";
import { useAppSelector } from "@/app/hooks";

export function useHeartbeat() {
  const isLoggedIn = useAppSelector((s) => s.auth.user !== null);
  const [sendHeartbeat] = useHeartbeatMutation();

  useEffect(() => {
    if (!isLoggedIn) return;
    void sendHeartbeat();
    const interval = setInterval(() => void sendHeartbeat(), 30_000);
    return () => clearInterval(interval);
  }, [isLoggedIn, sendHeartbeat]);
}
