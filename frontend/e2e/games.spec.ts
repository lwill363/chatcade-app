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

  test("user can tap a cell to make a move (mobile touch)", async ({ page }, testInfo) => {
    // This test verifies touch events work on the game board — skip on non-touch projects
    test.skip(testInfo.project.name !== "mobile", "Touch test only runs on mobile project");

    user = makeTestUser();
    await registerAndLogin(page, user);

    await page.getByTitle("Games").click();
    await page.getByRole("button", { name: /play vs bot/i }).click();
    await page.getByRole("button", { name: /start game/i }).click();
    await expect(page.getByText(/your turn/i)).toBeVisible();

    // Find an empty cell via the board testid (large board cells have no text content)
    const board = page.getByTestId("tictactoe-board");
    const emptyCell = board.getByRole("button").first();
    await emptyCell.tap();

    // After the move the board should show X
    await expect(board.getByText("X")).toBeVisible();
  });
});
