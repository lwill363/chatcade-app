import { type ReactNode } from "react";
import { Navigate } from "react-router";
import { useAppSelector } from "@/app/hooks";
import { Spinner } from "@/components/ui/Spinner";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const isBootstrapping = useAppSelector((s) => s.auth.isBootstrapping);

  // Wait for session restore to finish before deciding where to send the user.
  // Without this, a page reload with a valid refresh token would flash /login.
  if (isBootstrapping) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#1A1D2E]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
