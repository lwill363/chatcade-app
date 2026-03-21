import { type ReactNode, useEffect } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAppSelector } from "@/app/hooks";
import { getStoredRefreshToken } from "@/services/api";
import { Spinner } from "@/components/ui/Spinner";

export function PublicRoute({ children }: { children: ReactNode }) {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const isBootstrapping = useAppSelector((s) => s.auth.isBootstrapping);
  const navigate = useNavigate();

  // When the browser restores this page from bfcache (back button after login),
  // React doesn't re-run — so we need a pageshow listener to catch that case.
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted && getStoredRefreshToken()) {
        void navigate("/", { replace: true });
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [navigate]);

  if (isBootstrapping) return (
    <div className="flex flex-1 items-center justify-center bg-[#1A1D2E]">
      <Spinner size="lg" />
    </div>
  );
  if (accessToken) return <Navigate to="/" replace />;

  return <>{children}</>;
}
