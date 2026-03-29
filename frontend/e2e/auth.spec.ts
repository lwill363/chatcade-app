import { test, expect } from "@playwright/test";
import { makeTestUser, registerAndLogin, login, deleteTestAccount, type TestUser } from "./helpers";

test.describe("Authentication", () => {
  let user: TestUser;

  test.afterEach(async ({ page }) => {
    await deleteTestAccount(page);
  });

  test("user can register and land in the app", async ({ page }) => {
    user = makeTestUser();
    await registerAndLogin(page, user);
    await expect(page.getByTitle("Games")).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("user can log in with existing credentials", async ({ page }) => {
    user = makeTestUser();
    await registerAndLogin(page, user);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await login(page, user);
    await expect(page.getByTitle("Games")).toBeVisible();
  });

  test("login shows error for wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email or Username").fill("nonexistent@test.local");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log In" }).click();
    await expect(page.getByText(/invalid|incorrect|not found/i)).toBeVisible();
  });

  test("user can log out via settings", async ({ page }) => {
    user = makeTestUser();
    await registerAndLogin(page, user);

    // Delete account before logging out — after logout the refresh token is gone
    // and afterEach cleanup would silently fail
    await deleteTestAccount(page);

    await page.getByTitle("Settings").click();
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
