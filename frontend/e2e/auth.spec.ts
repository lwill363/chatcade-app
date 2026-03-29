import { test, expect } from "@playwright/test";
import { makeTestUser, registerAndLogin, login, deleteTestAccount } from "./helpers";

test.describe("Authentication", () => {
  test("user can register and land in the app", async ({ page }) => {
    const user = makeTestUser();

    await registerAndLogin(page, user);

    // Sidebar should be visible
    await expect(page.getByTitle("Rooms")).toBeVisible();

    await deleteTestAccount(page);
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("user can log in with existing credentials", async ({ page }) => {
    const user = makeTestUser();

    // Register first, then logout by navigating to login page
    await registerAndLogin(page, user);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    await login(page, user);
    await expect(page.getByTitle("Rooms")).toBeVisible();

    await deleteTestAccount(page);
  });

  test("login shows error for wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email or Username").fill("nonexistent@test.local");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log In" }).click();

    await expect(page.locator("text=/invalid|incorrect|not found/i")).toBeVisible();
  });

  test("user can log out via settings", async ({ page }) => {
    const user = makeTestUser();
    await registerAndLogin(page, user);

    // Open settings via the bottom-left avatar area
    await page.getByTitle("Settings").click();
    await page.getByRole("button", { name: /log out/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});
