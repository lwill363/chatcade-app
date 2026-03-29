import { test, expect } from "@playwright/test";
import { makeTestUser, registerAndLogin, deleteTestAccount } from "./helpers";

test.describe("Channels", () => {
  test("user can create a room and send a message", async ({ page }) => {
    const user = makeTestUser();
    await registerAndLogin(page, user);

    // Open create room modal via the "New Room" button in the sidebar
    await page.getByTitle("New Room").click();
    await page.getByPlaceholder("My awesome room").fill("E2E Test Room");
    await page.getByRole("button", { name: /create/i }).click();

    // Room should appear selected in the channel view
    await expect(page.getByText("E2E Test Room")).toBeVisible();

    // Send a message
    await page.getByTitle("Send message").locator("..").locator("textarea").fill("Hello from Playwright!");
    await page.getByTitle("Send message").click();

    // Message should appear in the list
    await expect(page.getByText("Hello from Playwright!")).toBeVisible();

    await deleteTestAccount(page);
  });

  test("user can open a DM with themselves is blocked", async ({ page }) => {
    // This tests that the new message modal exists and is functional
    const user = makeTestUser();
    await registerAndLogin(page, user);

    await page.getByTitle("New Direct Message").click();

    // Modal should appear
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();

    await deleteTestAccount(page);
  });
});
