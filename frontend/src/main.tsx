import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Provider, useDispatch } from "react-redux";
import { store } from "@/app/store";
import {
  setCredentials,
  setUser,
  doneBootstrapping,
} from "@/features/auth/authSlice";
import {
  getStoredRefreshToken,
  setStoredRefreshToken,
  clearStoredRefreshToken,
} from "@/services/api";
import App from "@/App";
import "@/index.css";

// Module-level guard: prevents StrictMode's intentional double-mount from
// firing two concurrent refresh requests. Two requests with the same single-use
// refresh token would cause the second to fail and wipe the newly-issued token.
let bootstrapStarted = false;

// Restores the user session from a stored refresh token before the first render
// reaches any protected routes. Sets isBootstrapping = false when done (either
// success or failure) so ProtectedRoute knows it's safe to redirect.
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (bootstrapStarted) return;
    bootstrapStarted = true;

    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      // Nothing to restore — not bootstrapping
      return;
    }

    fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          clearStoredRefreshToken();
          return;
        }
        const data = (await res.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        dispatch(
          setCredentials({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          })
        );
        setStoredRefreshToken(data.refreshToken);

        const meRes = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        if (meRes.ok) {
          const user = (await meRes.json()) as {
            id: string;
            username: string;
            email: string;
            role: string;
            displayName: string | null;
            bio: string | null;
            createdAt: string;
          };
          dispatch(setUser(user));
        }
      })
      .catch(() => {
        clearStoredRefreshToken();
      })
      .finally(() => {
        dispatch(doneBootstrapping());
      });
  }, [dispatch]);

  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <AuthBootstrap>
        <App />
      </AuthBootstrap>
    </Provider>
  </StrictMode>
);
