import { AppRouter } from "@/router";
import { useHeartbeat } from "@/hooks/useHeartbeat";

export default function App() {
  useHeartbeat();
  return <AppRouter />;
}
