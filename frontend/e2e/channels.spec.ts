import { test, expect } from "@playwright/test";
import {
  makeTestUser,
  registerAndLogin,
  deleteTestAccount,
  type TestUser,
} from "./helpers";

test.describe("Channels", () => {
  let user: TestUser;

  test.afterEach(async ({ page }) => {
    await deleteTestAccount(page);
  });

  test("user can create a room and send a message", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Mobile layout hides sidebar after room creation — desktop only");
    user = makeTestUser();
    await registerAndLogin(page, user);

    await page.getByTitle("New Room").click();
    await page.getByPlaceholder("My awesome room").fill("E2E Test Room");

    // Wait for the room creation API response before asserting modal closure
    const createRoomResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/api/channels/rooms") &&
        r.request().method() === "POST",
      { timeout: 20_000 },
    );
    await page.getByPlaceholder("My awesome room").press("Enter");
    const response = await createRoomResponse;
    expect(response.status()).toBe(201);

    // Modal should be closed now
    await expect(page.getByPlaceholder("My awesome room")).not.toBeVisible();
    await page.getByRole("button", { name: "E2E Test Room" }).click();

    // Send a message
    await page.getByRole("textbox").fill("Hello from Playwright!");
    await page.getByTitle("Send message").click();

    // Get message from message list view and not sidebar preview
    await expect(
      page.getByText("Hello from Playwright!", { exact: true }),
    ).toBeVisible();
  });

  test("new direct message modal opens", async ({ page }) => {
    user = makeTestUser();
    await registerAndLogin(page, user);

    await page.getByTitle("New Direct Message").click();

    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });
});
