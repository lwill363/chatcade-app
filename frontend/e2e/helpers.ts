import { type Page } from "@playwright/test";

const REFRESH_TOKEN_KEY = "chatcade_refresh_token";

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

export function makeTestUser(): TestUser {
  const ts = Date.now();
  return {
    username: `pw${ts}`,
    email: `pw${ts}@test.local`,
    password: "Password123!",
  };
}

export async function registerAndLogin(page: Page, user: TestUser) {
  await page.goto("/register");
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").first().fill(user.password);
  await page.getByLabel("Confirm Password").fill(user.password);
  await page.getByRole("button", { name: "Register" }).click();
  await page.waitForURL("/");
}

export async function login(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Email or Username").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForURL("/");
}

// Uses the stored refresh token to get a fresh access token, then deletes the account.
// Safe to call in afterAll even if the test failed partway through.
export async function deleteTestAccount(page: Page) {
  try {
    const refreshToken = await page.evaluate(
      (key) => localStorage.getItem(key),
      REFRESH_TOKEN_KEY
    );
    if (!refreshToken) return;

    const refreshRes = await page.request.post("/api/auth/refresh", {
      data: { refreshToken },
    });
    if (!refreshRes.ok()) return;

    const { accessToken } = await refreshRes.json() as { accessToken: string };
    await page.request.delete("/api/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Best-effort cleanup — don't fail the test run on cleanup errors
  }
}
