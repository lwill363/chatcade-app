import { test, expect } from "@playwright/test";
import { makeTestUser, registerAndLogin, deleteTestAccount } from "./helpers";

test.describe("Games", () => {
  test("user can navigate to the games tab", async ({ page }) => {
    const user = makeTestUser();
    await registerAndLogin(page, user);

    await page.getByTitle("Games").click();

    await expect(page.getByText("Tic-Tac-Toe")).toBeVisible();
    await expect(page.getByText("Solo play")).toBeVisible();

    await deleteTestAccount(page);
  });

  test("user can start a solo game against the bot", async ({ page }) => {
    const user = makeTestUser();
    await registerAndLogin(page, user);

    await page.getByTitle("Games").click();

    // Click Play vs Bot on the TicTacToe card
    await page.getByRole("button", { name: /play vs bot/i }).click();

    // Difficulty selection screen
    await expect(page.getByText("Choose a difficulty to begin")).toBeVisible();
    await page.getByRole("button", { name: /start game/i }).click();

    // Game board should appear
    await expect(page.getByText(/your turn/i)).toBeVisible();

    await deleteTestAccount(page);
  });

  test("solo game persists when navigating away and back", async ({ page }) => {
    const user = makeTestUser();
    await registerAndLogin(page, user);

    // Start a solo game
    await page.getByTitle("Games").click();
    await page.getByRole("button", { name: /play vs bot/i }).click();
    await page.getByRole("button", { name: /start game/i }).click();
    await expect(page.getByText(/your turn/i)).toBeVisible();

    // Navigate away to friends tab
    await page.getByTitle("Friends").click();

    // Navigate back to games
    await page.getByTitle("Games").click();

    // Game should still be active (not forfeited)
    await expect(page.getByText(/your turn|bot is thinking/i)).toBeVisible();

    await deleteTestAccount(page);
  });
});
