import { test, expect } from "@playwright/test";
import { makeTestUser, registerAndLogin, deleteTestAccount, type TestUser } from "./helpers";

test.describe("Games", () => {
  let user: TestUser;

  test.afterEach(async ({ page }) => {
    await deleteTestAccount(page);
  });

  test("user can navigate to the games tab", async ({ page }) => {
    user = makeTestUser();
    await registerAndLogin(page, user);

    await page.getByTitle("Games").click();

    await expect(page.getByText("Tic-Tac-Toe")).toBeVisible();
    await expect(page.getByText("Solo play")).toBeVisible();
  });

  test("user can start a solo game against the bot", async ({ page }) => {
    user = makeTestUser();
    await registerAndLogin(page, user);

    await page.getByTitle("Games").click();
    await page.getByRole("button", { name: /play vs bot/i }).click();

    await expect(page.getByText("Choose a difficulty to begin")).toBeVisible();
    await page.getByRole("button", { name: /start game/i }).click();

    await expect(page.getByText(/your turn/i)).toBeVisible();
  });
});
