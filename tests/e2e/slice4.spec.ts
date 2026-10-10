import { expect, test } from "@playwright/test";

test("records First Victory after the Core Comet milestone", async ({ page }) => {
  await page.goto("/app.html");

  await page.evaluate(() => {
    window.localStorage.clear();
    window.__meteorBreakersTest?.loadScenario("first-victory");
    window.__meteorBreakersTest?.step({}, 0.2);
  });

  await expect(page.locator("#victory")).toContainText("First Victory complete");
  const snapshot = await page.evaluate(() => window.__meteorBreakersTest?.getSnapshot());
  expect(snapshot?.wave).toBeGreaterThan(8);
});
